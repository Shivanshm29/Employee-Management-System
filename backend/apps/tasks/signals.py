from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Task, TaskComment


@receiver(post_save, sender=Task)
def sync_task_update_to_ticket(sender, instance, created, **kwargs):
    """When a task is updated AND has a linked ticket, add a comment to the ticket."""
    if not created and instance.linked_ticket_id:
        try:
            from apps.tickets.models import TicketComment
            last_history = instance.history.first()
            if last_history:
                msg = (
                    f"[Auto-sync] Task '{instance.title}' was updated: "
                    f"field '{last_history.field_name}' changed from "
                    f"'{last_history.old_value}' to '{last_history.new_value}'."
                )
            else:
                msg = f"[Auto-sync] Linked task '{instance.title}' was updated."
            TicketComment.objects.create(
                ticket=instance.linked_ticket,
                author=None,
                content=msg,
                is_system_generated=True,
            )
        except Exception:
            pass  # Non-critical: do not block the save


@receiver(post_save, sender=Task)
def notify_on_task_complete(sender, instance, created, **kwargs):
    """When a task is marked complete, notify the supervisor and support team."""
    if not created and instance.status == 'completed':
        try:
            from apps.notifications.models import Notification
            recipients = set()
            if instance.supervisor_id:
                recipients.add(instance.supervisor_id)
            for member in instance.support_members.all():
                recipients.add(member.id)

            for uid in recipients:
                Notification.objects.get_or_create(
                    user_id=uid,
                    title="Task Completed",
                    defaults={
                        'message': (
                            f"Task '{instance.title}' has been marked as complete"
                            f"{' with comment: ' + instance.completion_comment if instance.completion_comment else ''}."
                        ),
                        'notification_type': 'task_complete',
                        'related_id': instance.id,
                    },
                )
        except Exception:
            pass


@receiver(post_save, sender=TaskComment)
def transition_task_to_in_progress_on_comment(sender, instance, created, **kwargs):
    """When a comment is added to an 'assigned' task, move it to 'in_progress'."""
    if created and instance.task.status == 'assigned':
        task = instance.task
        task.status = 'in_progress'
        task.save()
        
        # Add history entry
        from .models import TaskHistory
        TaskHistory.objects.create(
            task=task,
            changed_by=instance.author,
            field_name='status',
            old_value='assigned',
            new_value='in_progress',
        )


@receiver(post_save, sender='tasks.DailyChecklist')
def transition_task_to_in_progress_on_checklist(sender, instance, created, **kwargs):
    """When a task is added to a daily checklist (i.e. 'addressed'), move it from 'assigned' to 'in_progress'."""
    if created and instance.task.status == 'assigned':
        task = instance.task
        task.status = 'in_progress'
        task.save()
        
        # Add history entry
        from .models import TaskHistory
        TaskHistory.objects.create(
            task=task,
            changed_by=instance.user,
            field_name='status',
            old_value='assigned',
            new_value='in_progress',
        )
