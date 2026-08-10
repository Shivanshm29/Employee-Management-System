from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
import random


class Command(BaseCommand):
    help = 'Seed the database with realistic sample EMS data.'

    def handle(self, *args, **options):
        from apps.accounts.models import User, Department
        from apps.tasks.models import Sprint, Task, TaskComment, DailyChecklist
        from apps.tickets.models import Ticket, TicketComment
        from apps.meetings.models import Meeting, MeetingParticipant
        from apps.rewards.models import Reward

        self.stdout.write('Seeding database...')

        # --- Departments ---
        dept_names = ['Engineering', 'Design', 'Product', 'Marketing', 'HR']
        depts = {}
        for name in dept_names:
            d, _ = Department.objects.get_or_create(name=name)
            depts[name] = d
        self.stdout.write(f'  [OK] {len(depts)} departments')

        # --- Users ---
        users_data = [
            {'username': 'admin', 'email': 'admin@ems.dev', 'first_name': 'Admin', 'last_name': 'User', 'role': 'admin', 'dept': 'Engineering'},
            {'username': 'manager1', 'email': 'manager1@ems.dev', 'first_name': 'Priya', 'last_name': 'Sharma', 'role': 'manager', 'dept': 'Engineering'},
            {'username': 'manager2', 'email': 'manager2@ems.dev', 'first_name': 'Arun', 'last_name': 'Kumar', 'role': 'manager', 'dept': 'Product'},
            {'username': 'emp1', 'email': 'emp1@ems.dev', 'first_name': 'Rahul', 'last_name': 'Mehta', 'role': 'employee', 'dept': 'Engineering'},
            {'username': 'emp2', 'email': 'emp2@ems.dev', 'first_name': 'Sneha', 'last_name': 'Patel', 'role': 'employee', 'dept': 'Engineering'},
            {'username': 'emp3', 'email': 'emp3@ems.dev', 'first_name': 'Vikram', 'last_name': 'Singh', 'role': 'employee', 'dept': 'Design'},
            {'username': 'emp4', 'email': 'emp4@ems.dev', 'first_name': 'Anjali', 'last_name': 'Nair', 'role': 'employee', 'dept': 'Product'},
        ]
        users = {}
        for ud in users_data:
            user, created = User.objects.get_or_create(
                email=ud['email'],
                defaults={
                    'username': ud['username'],
                    'first_name': ud['first_name'],
                    'last_name': ud['last_name'],
                    'role': ud['role'],
                    'department': depts[ud['dept']],
                    'job_title': f"{ud['role'].title()} — {ud['dept']}",
                    'hourly_rate': random.randint(30, 80),
                }
            )
            if created:
                user.set_password('password123')
                user.save()
            users[ud['username']] = user
        
        # Set managers
        for emp_key in ['emp1', 'emp2']:
            users[emp_key].manager = users['manager1']
            users[emp_key].save(update_fields=['manager'])
        for emp_key in ['emp3', 'emp4']:
            users[emp_key].manager = users['manager2']
            users[emp_key].save(update_fields=['manager'])

        self.stdout.write(f'  [OK] {len(users)} users (password: password123)')

        # --- Sprints ---
        today = date.today()
        sprint1, _ = Sprint.objects.get_or_create(
            name='Sprint 1 — API Foundation',
            defaults={
                'start_date': today - timedelta(days=5),
                'end_date': today + timedelta(days=5),
                'is_active': True,
                'goal': 'Build core API endpoints and authentication.',
                'created_by': users['manager1'],
            }
        )
        sprint2, _ = Sprint.objects.get_or_create(
            name='Sprint 2 — Frontend',
            defaults={
                'start_date': today + timedelta(days=6),
                'end_date': today + timedelta(days=16),
                'is_active': False,
                'goal': 'Build React dashboard and all UI components.',
                'created_by': users['manager1'],
            }
        )
        self.stdout.write('  [OK] 2 sprints')

        # --- Tickets ---
        ticket1, _ = Ticket.objects.get_or_create(
            title='Fix login page redirect bug',
            defaults={
                'description': 'After login, users are not redirected to the dashboard correctly.',
                'ticket_type': 'bug',
                'priority': 'high',
                'status': 'in_progress',
                'assignee': users['emp1'],
                'created_by': users['manager1'],
                'due_date': today + timedelta(days=3),
            }
        )
        ticket2, _ = Ticket.objects.get_or_create(
            title='Add dark mode support',
            defaults={
                'description': 'Implement dark mode toggle in the EMS frontend.',
                'ticket_type': 'feature',
                'priority': 'medium',
                'status': 'open',
                'assignee': users['emp3'],
                'created_by': users['emp4'],
            }
        )
        ticket3, _ = Ticket.objects.get_or_create(
            title='Performance issue in task list',
            defaults={
                'description': 'Task list takes >3s to load for users with 100+ tasks.',
                'ticket_type': 'bug',
                'priority': 'critical',
                'status': 'open',
                'assignee': users['emp2'],
                'created_by': users['manager1'],
            }
        )
        self.stdout.write('  [OK] 3 tickets')

        # --- Tasks ---
        tasks_data = [
            {
                'title': 'Set up Django project structure',
                'description': 'Create the backend scaffold with all apps.',
                'status': 'completed',
                'priority': 'high',
                'supervisor': users['manager1'],
                'assignee': users['emp1'],
                'sprint': sprint1,
                'estimated_hours': 3,
                'actual_hours': 2.5,
                'end_date': today - timedelta(days=2),
                'linked_ticket': ticket1,
            },
            {
                'title': 'Implement JWT authentication',
                'description': 'Set up SimpleJWT + Google OAuth views.',
                'status': 'completed',
                'priority': 'high',
                'supervisor': users['manager1'],
                'assignee': users['emp1'],
                'sprint': sprint1,
                'estimated_hours': 2,
                'actual_hours': 2,
                'end_date': today - timedelta(days=1),
            },
            {
                'title': 'Design task management UI mockup',
                'description': 'Create Figma wireframes for the task pages.',
                'status': 'in_progress',
                'priority': 'medium',
                'supervisor': users['manager2'],
                'assignee': users['emp3'],
                'sprint': sprint1,
                'estimated_hours': 4,
                'end_date': today + timedelta(days=2),
                'linked_ticket': ticket2,
            },
            {
                'title': 'Write API documentation',
                'description': 'Document all endpoints using Swagger/OpenAPI.',
                'status': 'assigned',
                'priority': 'low',
                'supervisor': users['manager1'],
                'assignee': users['emp2'],
                'sprint': sprint1,
                'estimated_hours': 2,
                'end_date': today + timedelta(days=4),
            },
            {
                'title': 'Optimize DB queries for task list',
                'description': 'Add select_related/prefetch_related to fix slow task queries.',
                'status': 'in_progress',
                'priority': 'critical',
                'supervisor': users['manager1'],
                'assignee': users['emp2'],
                'sprint': sprint1,
                'estimated_hours': 3,
                'end_date': today + timedelta(days=1),
                'linked_ticket': ticket3,
            },
            {
                'title': 'Build React home dashboard',
                'description': 'Implement the employee home dashboard with checklist and charts.',
                'status': 'assigned',
                'priority': 'high',
                'supervisor': users['manager2'],
                'assignee': users['emp4'],
                'sprint': sprint2,
                'estimated_hours': 6,
                'end_date': today + timedelta(days=8),
            },
        ]

        tasks = []
        for td in tasks_data:
            task, created = Task.objects.get_or_create(
                title=td['title'],
                defaults={**td, 'created_by': users['manager1']}
            )
            if created and td.get('status') == 'completed':
                task.completed_at = timezone.now()
                task.completion_comment = 'Task completed as part of sprint delivery.'
                task.save(update_fields=['completed_at', 'completion_comment'])
                TaskComment.objects.create(
                    task=task,
                    author=td['assignee'],
                    content='[Completion] Task completed as part of sprint delivery.',
                )
            tasks.append(task)

        # Add support members
        tasks[0].support_members.add(users['emp2'])
        tasks[2].support_members.add(users['emp4'])
        self.stdout.write(f'  [OK] {len(tasks)} tasks')

        # --- Daily Checklist (today) ---
        checklist_tasks = [t for t in tasks if t.status in ('assigned', 'in_progress') and t.assignee]
        for t in checklist_tasks[:3]:
            DailyChecklist.objects.get_or_create(
                user=t.assignee,
                task=t,
                date=today,
                defaults={'planned_hours': min(float(t.estimated_hours), 2.0)},
            )
        self.stdout.write('  [OK] Daily checklists')

        # --- Meetings ---
        meeting1, _ = Meeting.objects.get_or_create(
            title='Sprint Planning — Sprint 1',
            date=today,
            defaults={
                'start_time': '09:00',
                'end_time': '10:00',
                'task': tasks[0],
                'description': 'Plan sprint 1 tasks and assignments.',
                'created_by': users['manager1'],
            }
        )
        MeetingParticipant.objects.get_or_create(
            meeting=meeting1, user=users['manager1'],
            defaults={'is_organizer': True, 'rating': 4}
        )
        MeetingParticipant.objects.get_or_create(
            meeting=meeting1, user=users['emp1'],
            defaults={'rating': 5}
        )
        MeetingParticipant.objects.get_or_create(
            meeting=meeting1, user=users['emp2'],
            defaults={'rating': 3}
        )
        self.stdout.write('  [OK] 1 meeting')

        # --- Rewards ---
        Reward.objects.get_or_create(
            title='Star Performer',
            recipient=users['emp1'],
            defaults={
                'given_by': users['manager1'],
                'reward_type': 'award',
                'message': 'Outstanding work on the API foundation! Delivered ahead of schedule.',
                'points': 100,
            }
        )
        Reward.objects.get_or_create(
            title='Team Player',
            recipient=users['emp2'],
            defaults={
                'given_by': users['emp1'],
                'reward_type': 'recognition',
                'message': 'Always ready to help the team. Great collaboration spirit!',
                'points': 50,
            }
        )
        self.stdout.write('  [OK] 2 rewards')

        self.stdout.write(self.style.SUCCESS('\nDatabase seeded successfully!'))
        self.stdout.write('\nLogin credentials:')
        for ud in users_data:
            self.stdout.write(f"  Email: {ud['email']}  Pass: password123  [{ud['role']}]")
