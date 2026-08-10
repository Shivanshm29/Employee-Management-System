from django.db import models
from django.conf import settings


class Meeting(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    task = models.ForeignKey(
        'tasks.Task', on_delete=models.SET_NULL, null=True, blank=True, related_name='meetings'
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(max_length=255, blank=True)
    meeting_link = models.URLField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_meetings'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def duration_hours(self):
        from datetime import datetime
        start = datetime.combine(self.date, self.start_time)
        end = datetime.combine(self.date, self.end_time)
        diff = (end - start).total_seconds() / 3600
        return round(diff, 2)

    def __str__(self):
        return f"{self.title} on {self.date}"

    class Meta:
        ordering = ['date', 'start_time']


class MeetingParticipant(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='meeting_participations'
    )
    rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1–5
    is_organizer = models.BooleanField(default=False)
    accepted = models.BooleanField(null=True, blank=True)  # None=pending, True=accepted, False=declined

    class Meta:
        unique_together = ('meeting', 'user')

    def __str__(self):
        return f"{self.user} in {self.meeting}"
