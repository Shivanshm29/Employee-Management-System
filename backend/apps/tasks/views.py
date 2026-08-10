from rest_framework import generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Sum, Q
from datetime import date

from .models import Sprint, Task, TaskComment, TaskHistory, DailyChecklist
from .serializers import (
    SprintSerializer, TaskSerializer, TaskCommentSerializer,
    TaskHistorySerializer, DailyChecklistSerializer, TaskCompleteSerializer,
)
from apps.accounts.permissions import IsManagerOrAbove
from apps.notifications.models import Notification


class SprintViewSet(ModelViewSet):
    queryset = Sprint.objects.all()
    serializer_class = SprintSerializer
    filterset_fields = ['is_active']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsManagerOrAbove()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'priority', 'sprint', 'assignee', 'supervisor']
    search_fields = ['title', 'description']
    ordering_fields = ['priority', 'end_date', 'created_at']
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role in ('manager', 'admin'):
            if user.role == 'admin':
                qs = Task.objects.all()
            else:
                # Managers ONLY see their team's tasks
                qs = Task.objects.filter(
                    Q(assignee__manager=user) | 
                    Q(supervisor=user) | 
                    Q(support_members=user)
                ).distinct()
        else:
            # Employees see tasks where they are involved
            qs = Task.objects.filter(
                Q(assignee=user) | Q(supervisor=user) | Q(support_members=user) |
                Q(created_by=user)
            ).distinct()
        return qs.select_related('assignee', 'supervisor', 'linked_ticket', 'sprint')

    def perform_create(self, serializer):
        assignee = serializer.validated_data.get('assignee')
        if assignee and assignee.role != 'employee':
             from rest_framework.exceptions import ValidationError
             raise ValidationError("Tasks can only be assigned to employees.")
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        assignee = serializer.validated_data.get('assignee')
        if assignee and assignee.role != 'employee':
             from rest_framework.exceptions import ValidationError
             raise ValidationError("Tasks can only be assigned to employees.")
        
        # Only managers/admins can reassign tasks
        if 'assignee' in serializer.validated_data and not self.request.user.is_manager_or_above():
             from rest_framework.exceptions import ValidationError
             raise ValidationError("Only managers can reassign tasks.")
             
        serializer.save()

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        task = self.get_object()
        if task.status == 'completed':
            return Response({'error': 'Task is already completed.'}, status=400)

        serializer = TaskCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment_text = serializer.validated_data['comment']
        actual_hours = serializer.validated_data.get('actual_hours', task.estimated_hours)

        old_status = task.status
        if request.user.role in ('manager', 'admin'):
            task.status = 'completed'
            history_new_val = 'completed'
            task.completed_at = timezone.now()

            # Auto-credit reward if amount is set
            if task.assignee and task.reward_amount and float(task.reward_amount) > 0:
                from apps.rewards.models import Reward
                Reward.objects.create(
                    recipient=task.assignee,
                    given_by=request.user,
                    reward_type='bonus',
                    title=f'Task Reward: {task.title}',
                    message=f'Reward of \u20b9{task.reward_amount} for completing: {task.title}',
                    points=0,
                    amount=task.reward_amount,
                )
                Notification.objects.create(
                    user=task.assignee,
                    title='\U0001f4b0 Reward Credited!',
                    message=f'You earned \u20b9{task.reward_amount} for completing "{task.title}".',
                    notification_type='general',
                    related_id=task.id,
                )
        else:
            task.status = 'pending_review'
            history_new_val = 'pending_review'

        task.completion_comment = comment_text
        task.actual_hours = actual_hours
        task.save()

        # Automatically update or create DailyChecklist for today
        if task.assignee:
            today = timezone.now().date()
            checklist_entry, created = DailyChecklist.objects.get_or_create(
                user=task.assignee,
                task=task,
                date=today,
                defaults={'planned_hours': task.estimated_hours}
            )
            checklist_entry.is_completed = True
            checklist_entry.completed_at = timezone.now()
            checklist_entry.completion_comment = comment_text
            checklist_entry.save()

        # Add comment to task
        TaskComment.objects.create(
            task=task,
            author=request.user,
            content=f"[{'Confirmation' if request.user.is_manager_or_above() else 'Submission'}] {comment_text}",
        )

        # History entry
        TaskHistory.objects.create(
            task=task,
            changed_by=request.user,
            field_name='status',
            old_value=old_status,
            new_value=history_new_val,
        )

        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='reassign')
    def reassign_with_changes(self, request, pk=None):
        """Manager reassigns task back to employee with required changes."""
        if not request.user.is_manager_or_above():
            return Response({'error': 'Only managers can reassign tasks.'}, status=403)
            
        task = self.get_object()
        comment_text = request.data.get('comment', '').strip()
        if not comment_text:
            return Response({'error': 'Feedback comment is required for reassignment.'}, status=400)

        old_status = task.status
        task.status = 'in_progress'
        task.save()

        TaskComment.objects.create(
            task=task,
            author=request.user,
            content=f"[REASSIGNED] Required Changes: {comment_text}",
        )

        TaskHistory.objects.create(
            task=task,
            changed_by=request.user,
            field_name='status',
            old_value=old_status,
            new_value='in_progress',
        )

        return Response(TaskSerializer(task, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        task = self.get_object()
        if request.method == 'GET':
            qs = task.comments.all()
            return Response(TaskCommentSerializer(qs, many=True).data)
        
        if not request.user.is_manager_or_above():
            return Response({'error': 'Only managers can add comments.'}, status=403)
            
        serializer = TaskCommentSerializer(data={**request.data, 'task': task.id})
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user, task=task)
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        task = self.get_object()
        qs = task.history.all()
        return Response(TaskHistorySerializer(qs, many=True).data)


class DailyChecklistView(APIView):
    """
    GET  /api/tasks/checklist/?date=YYYY-MM-DD  → list user's checklist for a date
    POST /api/tasks/checklist/                  → add task to checklist
    """

    def get(self, request):
        check_date = request.query_params.get('date', str(date.today()))
        user = request.user
        if request.query_params.get('user_id') and user.is_manager_or_above():
            user_id = request.query_params['user_id']
        else:
            user_id = user.id

        entries = DailyChecklist.objects.filter(
            user_id=user_id, date=check_date
        ).select_related('task')
        total_hours = entries.aggregate(total=Sum('planned_hours'))['total'] or 0
        return Response({
            'date': check_date,
            'total_planned_hours': float(total_hours),
            'remaining_hours': float(max(0, 8 - total_hours)),
            'entries': DailyChecklistSerializer(entries, many=True, context={'request': request}).data,
        })

    def post(self, request):
        serializer = DailyChecklistSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)


class DailyChecklistDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DailyChecklistSerializer

    def get_queryset(self):
        return DailyChecklist.objects.filter(user=self.request.user)

    def update_partial(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_checklist_item(self, request, pk=None):
        entry = self.get_object()
        if entry.is_completed:
            return Response({'error': 'Already completed.'}, status=400)
        comment = request.data.get('comment', '')
        if not comment:
            return Response({'error': 'Completion comment is required.'}, status=400)
        entry.is_completed = True
        entry.completed_at = timezone.now()
        entry.completion_comment = comment
        entry.save()
        return Response(DailyChecklistSerializer(entry, context={'request': request}).data)


class ChecklistCompleteView(APIView):
    """POST /api/tasks/checklist/<pk>/complete/ — mark checklist item done."""

    def post(self, request, pk):
        try:
            entry = DailyChecklist.objects.get(pk=pk, user=request.user)
        except DailyChecklist.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)
        if entry.is_completed:
            return Response({'error': 'Already completed.'}, status=400)
        comment = request.data.get('comment', '').strip()
        if not comment:
            return Response({'error': 'A completion comment is required.'}, status=400)
        entry.is_completed = True
        entry.completed_at = timezone.now()
        entry.completion_comment = comment
        entry.save()

        # Also mark the main task as pending review (for employees) or completed (for managers)
        task = entry.task
        if task.status not in ('completed', 'pending_review'):
            is_manager = request.user.is_manager_or_above()
            new_status = 'completed' if is_manager else 'pending_review'
            
            task.status = new_status
            if is_manager:
                task.completed_at = timezone.now()
            
            task.completion_comment = comment
            task.save()
            
            TaskComment.objects.create(
                task=task,
                author=request.user,
                content=f"[{'Confirmation' if is_manager else 'Submission'} via Checklist] {comment}",
            )

        return Response(DailyChecklistSerializer(entry, context={'request': request}).data)
