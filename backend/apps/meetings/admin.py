from django.contrib import admin
from .models import Meeting, MeetingParticipant


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ['title', 'date', 'start_time', 'end_time', 'created_by']
    list_filter = ['date']
    search_fields = ['title']


@admin.register(MeetingParticipant)
class MeetingParticipantAdmin(admin.ModelAdmin):
    list_display = ['meeting', 'user', 'rating', 'is_organizer', 'accepted']
