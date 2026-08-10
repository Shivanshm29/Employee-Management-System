from rest_framework import serializers
from django.utils import timezone
from .models import Sprint, Task, TaskComment, TaskHistory, DailyChecklist
from apps.accounts.serializers import UserMiniSerializer


class SprintSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = [
            'id', 'name', 'start_date', 'end_date', 'is_active',
            'goal', 'created_by', 'created_by_name', 'task_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_task_count(self, obj):
        return obj.tasks.count()


class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)

    class Meta:
        model = TaskComment
        fields = [
            'id', 'task', 'author', 'author_name', 'author_avatar',
            'content', 'created_at', 'updated_at', 'is_system_generated',
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at', 'is_system_generated']


class TaskHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)

    class Meta:
        model = TaskHistory
        fields = ['id', 'field_name', 'old_value', 'new_value', 'changed_by_name', 'timestamp']


class TaskSerializer(serializers.ModelSerializer):
    assignee_detail = UserMiniSerializer(source='assignee', read_only=True)
    supervisor_detail = UserMiniSerializer(source='supervisor', read_only=True)
    support_members_detail = UserMiniSerializer(source='support_members', many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    sprint_name = serializers.CharField(source='sprint.name', read_only=True)
    linked_ticket_title = serializers.CharField(source='linked_ticket.title', read_only=True)
    comment_count = serializers.SerializerMethodField()
    support_members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=__import__('apps.accounts.models', fromlist=['User']).User.objects.all(),
        required=False,
    )

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'priority',
            'supervisor', 'supervisor_detail',
            'assignee', 'assignee_detail',
            'support_members', 'support_members_detail',
            'linked_ticket', 'linked_ticket_title',
            'sprint', 'sprint_name',
            'estimated_hours', 'actual_hours', 'reward_amount',
            'end_date', 'completed_at', 'completion_comment',
            'created_by', 'created_by_name',
            'comment_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'completed_at']

    def get_comment_count(self, obj):
        return obj.comments.count()

    def validate(self, attrs):
        # Validate end_date is not in the past when creating
        end_date = attrs.get('end_date')
        if end_date and not self.instance:
            from datetime import date
            if end_date < date.today():
                raise serializers.ValidationError({'end_date': 'End date cannot be in the past.'})
        return attrs

    def _record_history(self, instance, validated_data, request):
        user = request.user if request else None
        track_fields = ['title', 'description', 'status', 'priority', 'assignee',
                        'supervisor', 'estimated_hours', 'end_date', 'linked_ticket']
        for field in track_fields:
            if field in validated_data:
                old_val = getattr(instance, field)
                new_val = validated_data[field]
                if str(old_val) != str(new_val):
                    TaskHistory.objects.create(
                        task=instance,
                        changed_by=user,
                        field_name=field,
                        old_value=str(old_val),
                        new_value=str(new_val),
                    )

    def update(self, instance, validated_data):
        request = self.context.get('request')
        self._record_history(instance, validated_data, request)
        return super().update(instance, validated_data)


class TaskCompleteSerializer(serializers.Serializer):
    comment = serializers.CharField(min_length=5, help_text="Completion comment required.")
    actual_hours = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)


class DailyChecklistSerializer(serializers.ModelSerializer):
    task_detail = TaskSerializer(source='task', read_only=True)

    class Meta:
        model = DailyChecklist
        fields = [
            'id', 'user', 'task', 'task_detail', 'date',
            'planned_hours', 'is_completed', 'completed_at', 'completion_comment',
        ]
        read_only_fields = ['id', 'user', 'completed_at']

    def validate(self, attrs):
        user = self.context['request'].user
        date = attrs.get('date')
        planned_hours = attrs.get('planned_hours', 0)

        if date and planned_hours:
            existing = DailyChecklist.objects.filter(user=user, date=date)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            total = sum(e.planned_hours for e in existing) + planned_hours
            if total > 8:
                raise serializers.ValidationError(
                    f"Daily task hours cannot exceed 8. Already allocated: "
                    f"{total - planned_hours:.1f}h, trying to add: {planned_hours}h. "
                    f"Remaining: {8 - (total - planned_hours):.1f}h"
                )
        return attrs
