import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.meetings.models import Meeting, MeetingParticipant
from apps.accounts.models import User
from apps.tasks.models import Task

def setup_data():
    now = datetime.now()
    today = now.date()
    current_time = now.time()

    print(f"Current Time: {now}")

    # 1. Delete ALL existing meetings for a clean state
    # (Previously only deleted past meetings, but user likely wants a clean slate)
    count = Meeting.objects.all().count()
    Meeting.objects.all().delete()
    print(f"Deleted {count} existing meetings.")

    # 2. Find a manager and a task
    manager = User.objects.filter(role='manager').first()
    if not manager:
        manager = User.objects.filter(role='admin').first()
    
    task = Task.objects.first()

    if not manager:
        print("Error: No manager or admin user found to host meetings.")
        return

    # 3. Add 2 new sample meetings
    
    # Meeting 1: Future Sync (Starts in 2 hours)
    m1_start = now + timedelta(hours=2)
    m1_end = m1_start + timedelta(hours=1)
    
    m1 = Meeting.objects.create(
        title="Weekly Ops Alignment",
        description="Discussing operational goals for the upcoming week.",
        date=m1_start.date(),
        start_time=m1_start.time(),
        end_time=m1_end.time(),
        created_by=manager,
        task=task,
        meeting_link=f"https://meet.jit.si/EMS-Meeting-Sync-{m1_start.strftime('%H%M')}"
    )
    MeetingParticipant.objects.create(meeting=m1, user=manager, is_organizer=True)
    print(f"Created Joinable Meeting: {m1.title} at {m1.start_time}")

    # Meeting 2: Future Planning (Starts in 5 hours)
    m2_start = now + timedelta(hours=5)
    m2_end = m2_start + timedelta(hours=1)
    
    m2 = Meeting.objects.create(
        title="Strategic Roadmap Q4",
        description="Defining the high-level roadmap for next quarter.",
        date=m2_start.date(),
        start_time=m2_start.time(),
        end_time=m2_end.time(),
        created_by=manager,
        task=task,
        meeting_link=f"https://meet.jit.si/EMS-Meeting-Planning-{m2_start.strftime('%H%M')}"
    )
    MeetingParticipant.objects.create(meeting=m2, user=manager, is_organizer=True)
    print(f"Created Future Meeting: {m2.title} at {m2.start_time}")

if __name__ == "__main__":
    setup_data()
