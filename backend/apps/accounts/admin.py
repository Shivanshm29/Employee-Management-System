from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'full_name', 'role', 'department', 'is_active']
    list_filter = ['role', 'department', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['email']
    readonly_fields = ['date_joined', 'updated_at']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('EMS Info', {
            'fields': ('role', 'department', 'phone', 'avatar',
                       'job_title', 'hourly_rate', 'manager')
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('EMS Info', {'fields': ('role', 'email', 'first_name', 'last_name')}),
    )
