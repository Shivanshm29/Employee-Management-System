from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from datetime import date

from .models import Meeting, MeetingParticipant
from .serializers import MeetingSerializer, MeetingParticipantSerializer
from apps.notifications.models import Notification


class MeetingViewSet(viewsets.ModelViewSet):
    serializer_class = MeetingSerializer
    filterset_fields = ['date', 'task']
    search_fields = ['title', 'description']
    ordering_fields = ['date', 'start_time']
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            from apps.accounts.permissions import IsManagerOrAbove
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role in ('manager', 'hr', 'admin'):
            qs = Meeting.objects.all()
        else:
            qs = Meeting.objects.filter(
                Q(created_by=user) | Q(participants__user=user)
            ).distinct()
        return qs.prefetch_related('participants__user')

    def perform_create(self, serializer):
        meeting = serializer.save(created_by=self.request.user)
        # Notify participants
        for participant in meeting.participants.exclude(user=self.request.user):
            Notification.objects.create(
                user=participant.user,
                title='Meeting Invitation',
                message=f"You've been invited to '{meeting.title}' on {meeting.date} at {meeting.start_time}.",
                notification_type='meeting_invite',
                related_id=meeting.id,
            )

    @action(detail=True, methods=['post'], url_path='rate')
    def rate(self, request, pk=None):
        meeting = self.get_object()
        try:
            participant = MeetingParticipant.objects.get(meeting=meeting, user=request.user)
        except MeetingParticipant.DoesNotExist:
            return Response({'error': 'You are not a participant of this meeting.'}, status=403)
        rating = request.data.get('rating')
        if not rating or not (1 <= int(rating) <= 5):
            return Response({'error': 'Rating must be between 1 and 5.'}, status=400)
        participant.rating = int(rating)
        participant.save(update_fields=['rating'])
        return Response(MeetingParticipantSerializer(participant).data)

    @action(detail=True, methods=['post', 'delete'], url_path='participants/(?P<user_id>[^/.]+)')
    def manage_participant(self, request, pk=None, user_id=None):
        meeting = self.get_object()
        if request.method == 'POST':
            from apps.accounts.models import User
            try:
                user = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found.'}, status=404)
            p, created = MeetingParticipant.objects.get_or_create(meeting=meeting, user=user)
            return Response(MeetingParticipantSerializer(p).data, status=201 if created else 200)
        else:
            MeetingParticipant.objects.filter(meeting=meeting, user_id=user_id).delete()
            return Response(status=204)

    @action(detail=False, methods=['get'], url_path='today')
    def today_meetings(self, request):
        today = date.today()
        qs = self.get_queryset().filter(date=today)
        return Response(MeetingSerializer(qs, many=True, context={'request': request}).data)
