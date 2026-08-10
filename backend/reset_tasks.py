import os
import django
import sys
import random
from datetime import timedelta

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from apps.accounts.models import User
from apps.tasks.models import Task, DailyChecklist, TaskHistory, TaskComment
from apps.rewards.models import Reward

def seed_tasks():
    """Resets task and reward data and creates sample tasks for active employees."""
    print("Deleting existing tasks, history, comments, checklists, and rewards...")
    Task.objects.all().delete()
    Reward.objects.all().delete()
    print("Deletion complete.")

    employees = User.objects.filter(is_active=True, role='employee')
    tasks_created = 0

    print("Creating fresh tasks with rewards...")
    for emp in employees:
        manager = emp.manager or User.objects.filter(role='admin').first()
        if not manager:
            continue

        Task.objects.create(
            title=f"Initial System Setup - {emp.first_name}",
            description="Complete the onboarding and environment setup.",
            status="in_progress",
            priority="high",
            supervisor=manager,
            assignee=emp,
            estimated_hours=4.0,
            actual_hours=0.0,
            reward_amount=random.choice([2500.00, 2750.00, 3000.00]),
            end_date=timezone.now().date() + timedelta(days=1),
            created_by=manager
        )

        Task.objects.create(
            title=f"Review Component Architecture - {emp.first_name}",
            description="Review the initial design documents for the new UI components.",
            status="assigned",
            priority="medium",
            supervisor=manager,
            assignee=emp,
            estimated_hours=2.5,
            actual_hours=0.0,
            reward_amount=random.choice([2200.00, 2350.00, 2500.00]),
            end_date=timezone.now().date() + timedelta(days=3),
            created_by=manager
        )

        Task.objects.create(
            title=f"Documentation Update - {emp.first_name}",
            description="Update the internal wiki with recent findings.",
            status="assigned",
            priority="low",
            supervisor=manager,
            assignee=emp,
            estimated_hours=1.5,
            actual_hours=0.0,
            reward_amount=random.choice([2000.00, 2150.00, 2200.00]),
            end_date=timezone.now().date() + timedelta(days=5),
            created_by=manager
        )
        tasks_created += 3

    print(f"Successfully created {tasks_created} new tasks with rewards!")

if __name__ == "__main__":
    seed_tasks()
