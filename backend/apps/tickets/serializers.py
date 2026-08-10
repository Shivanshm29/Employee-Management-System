from rest_framework import serializers
from .models import Ticket, TicketComment, TicketHistory
from apps.accounts.serializers import UserMiniSerializer


class TicketCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = TicketComment
        fields = ['id', 'ticket', 'author', 'author_name', 'content',
                  'is_system_generated', 'created_at']
        read_only_fields = ['id', 'author', 'created_at', 'is_system_generated']


class TicketHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)

    class Meta:
        model = TicketHistory
        fields = ['id', 'field_name', 'old_value', 'new_value', 'changed_by_name', 'timestamp']


class TicketSerializer(serializers.ModelSerializer):
    assignee_detail = UserMiniSerializer(source='assignee', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    linked_task_title = serializers.CharField(source='linked_task.title', read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id', 'title', 'description', 'ticket_type', 'status', 'priority',
            'assignee', 'assignee_detail',
            'created_by', 'created_by_name',
            'approved_by', 'approved_by_name',
            'linked_task', 'linked_task_title',
            'due_date', 'approved_at', 'resolved_at',
            'comment_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'approved_by', 'approved_at',
                            'resolved_at', 'created_at', 'updated_at']

    def get_comment_count(self, obj):
        return obj.comments.count()

    def _record_history(self, instance, validated_data, request):
        user = request.user if request else None
        track_fields = ['title', 'status', 'priority', 'assignee', 'due_date', 'linked_task']
        for field in track_fields:
            if field in validated_data:
                old_val = getattr(instance, field)
                new_val = validated_data[field]
                if str(old_val) != str(new_val):
                    TicketHistory.objects.create(
                        ticket=instance,
                        changed_by=user,
                        field_name=field,
                        old_value=str(old_val),
                        new_value=str(new_val),
                    )

    def update(self, instance, validated_data):
        request = self.context.get('request')
        self._record_history(instance, validated_data, request)
        return super().update(instance, validated_data)


class TicketReassignSerializer(serializers.Serializer):
    new_assignee = serializers.IntegerField()
    reason = serializers.CharField(required=False, default='')
