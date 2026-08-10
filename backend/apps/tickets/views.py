from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q

from .models import Ticket, TicketComment, TicketHistory
from .serializers import (
    TicketSerializer, TicketCommentSerializer,
    TicketHistorySerializer, TicketReassignSerializer,
)
from apps.accounts.models import User
from apps.accounts.permissions import IsManagerOrAbove
from apps.notifications.models import Notification


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    filterset_fields = ['status', 'priority', 'ticket_type', 'assignee']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'priority', 'status']

    def get_queryset(self):
        user = self.request.user
        if user.role in ('manager', 'hr', 'admin'):
            return Ticket.objects.all().select_related('assignee', 'created_by', 'linked_task')
        return Ticket.objects.filter(
            Q(assignee=user) | Q(created_by=user)
        ).distinct().select_related('assignee', 'created_by', 'linked_task')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='approve',
            permission_classes=[IsManagerOrAbove])
    def approve(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status not in ('open', 'pending_approval'):
            return Response({'error': 'Ticket cannot be approved in its current state.'}, status=400)

        ticket.status = 'approved'
        ticket.approved_by = request.user
        ticket.approved_at = timezone.now()
        ticket.save()

        # Auto-create a task for the assignee
        if ticket.assignee:
            from apps.tasks.models import Task
            task = Task.objects.create(
                title=f"[Ticket] {ticket.title}",
                description=ticket.description,
                assignee=ticket.assignee,
                priority=ticket.priority,
                end_date=ticket.due_date,
                created_by=request.user,
                linked_ticket=ticket,
            )
            TicketComment.objects.create(
                ticket=ticket,
                author=request.user,
                content=f"Ticket approved by {request.user.full_name}. Task created and added to assignee's list.",
                is_system_generated=True,
            )
            Notification.objects.create(
                user=ticket.assignee,
                title='Ticket Approved',
                message=f"Ticket '{ticket.title}' has been approved and added to your task list.",
                notification_type='ticket_approved',
                related_id=ticket.id,
            )

        return Response(TicketSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='reassign')
    def reassign(self, request, pk=None):
        ticket = self.get_object()
        serializer = TicketReassignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            new_assignee = User.objects.get(pk=serializer.validated_data['new_assignee'])
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

        old_assignee = ticket.assignee
        reason = serializer.validated_data['reason']

        # Record history
        TicketHistory.objects.create(
            ticket=ticket,
            changed_by=request.user,
            field_name='assignee',
            old_value=str(old_assignee),
            new_value=str(new_assignee),
        )

        ticket.assignee = new_assignee
        ticket.save(update_fields=['assignee'])

        # Sync linked tasks too
        for task in ticket.tasks.all():
            task.assignee = new_assignee
            task.save(update_fields=['assignee'])

        # Add comment
        TicketComment.objects.create(
            ticket=ticket,
            author=request.user,
            content=(
                f"Ticket reassigned from {old_assignee} to {new_assignee}."
                + (f" Reason: {reason}" if reason else "")
            ),
            is_system_generated=True,
        )

        # Notify new assignee
        Notification.objects.create(
            user=new_assignee,
            title='Ticket Reassigned to You',
            message=f"Ticket '{ticket.title}' has been reassigned to you.",
            notification_type='ticket_reassigned',
            related_id=ticket.id,
        )
        if old_assignee:
            Notification.objects.create(
                user=old_assignee,
                title='Ticket Reassigned',
                message=f"Ticket '{ticket.title}' has been reassigned to {new_assignee.full_name}.",
                notification_type='ticket_reassigned',
                related_id=ticket.id,
            )

        return Response(TicketSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        ticket = self.get_object()
        if request.method == 'GET':
            return Response(TicketCommentSerializer(ticket.comments.all(), many=True).data)
        s = TicketCommentSerializer(data={**request.data, 'ticket': ticket.id})
        s.is_valid(raise_exception=True)
        s.save(author=request.user, ticket=ticket)
        return Response(s.data, status=201)

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        ticket = self.get_object()
        return Response(TicketHistorySerializer(ticket.history.all(), many=True).data)
