from django.contrib import admin
from .models import Sprint, Task, TaskComment, TaskHistory, DailyChecklist


@admin.register(Sprint)
class SprintAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_active']
    list_filter = ['is_active']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'status', 'priority', 'assignee', 'sprint', 'end_date']
    list_filter = ['status', 'priority', 'sprint']
    search_fields = ['title', 'description']
    filter_horizontal = ['support_members']


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ['task', 'author', 'created_at', 'is_system_generated']
    list_filter = ['is_system_generated']


@admin.register(TaskHistory)
class TaskHistoryAdmin(admin.ModelAdmin):
    list_display = ['task', 'field_name', 'changed_by', 'timestamp']
    readonly_fields = ['task', 'field_name', 'old_value', 'new_value', 'changed_by', 'timestamp']


@admin.register(DailyChecklist)
class DailyChecklistAdmin(admin.ModelAdmin):
    list_display = ['user', 'task', 'date', 'planned_hours', 'is_completed']
    list_filter = ['date', 'is_completed']
