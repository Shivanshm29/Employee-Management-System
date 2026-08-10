from rest_framework import serializers
import uuid
from .models import Meeting, MeetingParticipant
from apps.accounts.serializers import UserMiniSerializer


class MeetingParticipantSerializer(serializers.ModelSerializer):
    user_detail = UserMiniSerializer(source='user', read_only=True)

    class Meta:
        model = MeetingParticipant
        fields = ['id', 'meeting', 'user', 'user_detail', 'rating', 'is_organizer', 'accepted']
        read_only_fields = ['id']

    def validate_rating(self, value):
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class MeetingSerializer(serializers.ModelSerializer):
    participants = MeetingParticipantSerializer(many=True, read_only=True)
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    duration_hours = serializers.ReadOnlyField()
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = [
            'id', 'title', 'description', 'task', 'task_title',
            'date', 'start_time', 'end_time', 'location', 'meeting_link',
            'duration_hours', 'average_rating',
            'participants', 'participant_ids',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_average_rating(self, obj):
        rated = [p.rating for p in obj.participants.all() if p.rating is not None]
        return round(sum(rated) / len(rated), 1) if rated else None

    def validate(self, attrs):
        if attrs.get('start_time') and attrs.get('end_time'):
            if attrs['start_time'] >= attrs['end_time']:
                raise serializers.ValidationError({'end_time': 'End time must be after start time.'})
        return attrs

    def create(self, validated_data):
        participant_ids = validated_data.pop('participant_ids', [])
        task = validated_data.get('task')
        
        # Generate Jitsi link if empty
        if not validated_data.get('meeting_link'):
            unique_id = str(uuid.uuid4())[:8]
            room_name = f"EMS-Meeting-{unique_id}"
            validated_data['meeting_link'] = f"https://meet.jit.si/{room_name}"

        meeting = Meeting.objects.create(**validated_data)

        # Auto-import task participants: assignee + support members
        auto_ids = set(participant_ids)
        if task:
            if task.assignee_id:
                auto_ids.add(task.assignee_id)
            if task.supervisor_id:
                auto_ids.add(task.supervisor_id)
            for member in task.support_members.all():
                auto_ids.add(member.id)

        # Add creator as organizer
        MeetingParticipant.objects.create(
            meeting=meeting,
            user=validated_data.get('created_by') or meeting.created_by,
            is_organizer=True,
        )
        for uid in auto_ids:
            if uid != (meeting.created_by_id):
                MeetingParticipant.objects.get_or_create(meeting=meeting, user_id=uid)

        return meeting
