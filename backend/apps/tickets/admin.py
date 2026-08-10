from django.contrib import admin
from .models import Ticket, TicketComment, TicketHistory


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'priority', 'ticket_type', 'assignee', 'created_at']
    list_filter = ['status', 'priority', 'ticket_type']
    search_fields = ['title', 'description']


@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'author', 'is_system_generated', 'created_at']


@admin.register(TicketHistory)
class TicketHistoryAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'field_name', 'changed_by', 'timestamp']
    readonly_fields = ['ticket', 'field_name', 'old_value', 'new_value', 'changed_by', 'timestamp']
