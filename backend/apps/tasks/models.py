from django.db import models
from django.conf import settings
from django.utils import timezone


class Sprint(models.Model):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    goal = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_sprints'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-start_date']


class Task(models.Model):
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('pending_review', 'Pending Review'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')

    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='supervised_tasks'
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_tasks'
    )
    support_members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name='support_tasks'
    )
    linked_ticket = models.ForeignKey(
        'tickets.Ticket', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tasks'
    )
    sprint = models.ForeignKey(
        Sprint, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks'
    )

    estimated_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    actual_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    reward_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Monetary reward in ₹ for completing this task')
    end_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completion_comment = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_tasks'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Priority order value derived from priority field for sorting
    @property
    def priority_order(self):
        order_map = {'critical': 1, 'high': 2, 'medium': 3, 'low': 4}
        return order_map.get(self.priority, 99)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['priority', 'end_date']


class TaskComment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_system_generated = models.BooleanField(default=False)

    def __str__(self):
        return f"Comment on {self.task.title} by {self.author}"

    class Meta:
        ordering = ['created_at']


class TaskHistory(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='history')
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.task.title} — {self.field_name} changed at {self.timestamp}"

    class Meta:
        ordering = ['-timestamp']


class DailyChecklist(models.Model):
    """Tracks which tasks appear on an employee's daily checklist for a given date."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_checklists'
    )
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='checklist_entries')
    date = models.DateField()
    planned_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completion_comment = models.TextField(blank=True)

    class Meta:
        unique_together = ('user', 'task', 'date')
        ordering = ['task__priority', 'task__end_date']

    def __str__(self):
        return f"{self.user} — {self.task} — {self.date}"
