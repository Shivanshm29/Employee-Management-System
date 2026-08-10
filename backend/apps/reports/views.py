import csv
from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.http import HttpResponse
from django.db.models import Count, Sum, Q, Avg
from django.contrib.auth import get_user_model

from apps.tasks.models import Task, DailyChecklist
from apps.tickets.models import Ticket
from apps.meetings.models import Meeting
from apps.accounts.permissions import IsManagerOrAbove
from apps.rewards.models import Reward

User = get_user_model()


def _parse_date_range(request):
    today = date.today()
    start = request.query_params.get('start_date', str(today - timedelta(days=30)))
    end = request.query_params.get('end_date', str(today))
    return start, end


class TaskReportView(APIView):
    """
    GET /api/reports/tasks/
    Query params: start_date, end_date, sprint, user_id (manager+)
    Returns: completed vs pending breakdown, hours worked
    """

    def get(self, request):
        start, end = _parse_date_range(request)
        user = request.user

        qs = Task.objects.filter(created_at__date__gte=start, created_at__date__lte=end)
        if not user.is_manager_or_above():
            qs = qs.filter(Q(assignee=user) | Q(supervisor=user))
        elif request.query_params.get('user_id'):
            qs = qs.filter(assignee_id=request.query_params['user_id'])

        sprint_id = request.query_params.get('sprint')
        if sprint_id:
            qs = qs.filter(sprint_id=sprint_id)

        status_breakdown = list(
            qs.values('status').annotate(count=Count('id'))
        )
        priority_breakdown = list(
            qs.values('priority').annotate(count=Count('id'))
        )
        hours_data = qs.aggregate(
            total_estimated=Sum('estimated_hours'),
            total_actual=Sum('actual_hours'),
        )

        # Daily checklist completion for last 7 days
        checklist_qs = DailyChecklist.objects.filter(
            date__gte=start, date__lte=end
        )
        if not user.is_manager_or_above():
            checklist_qs = checklist_qs.filter(user=user)

        daily_summary = list(
            checklist_qs.values('date').annotate(
                total=Count('id'),
                completed=Count('id', filter=Q(is_completed=True)),
                hours=Sum('planned_hours'),
            ).order_by('date')
        )

        return Response({
            'period': {'start': start, 'end': end},
            'summary': {
                'total_tasks': qs.count(),
                'completed': qs.filter(status='completed').count(),
                'in_progress': qs.filter(status='in_progress').count(),
                'assigned': qs.filter(status='assigned').count(),
                **hours_data,
            },
            'status_breakdown': status_breakdown,
            'priority_breakdown': priority_breakdown,
            'daily_checklist': daily_summary,
        })


class ProductivityReportView(APIView):
    """
    GET /api/reports/productivity/
    Returns employee productivity metrics (manager+ sees team, employee sees self)
    """
    def get(self, request):
        start, end = _parse_date_range(request)
        user = request.user

        if user.is_manager_or_above():
            if user.role == 'admin':
                users_qs = User.objects.filter(is_active=True)
            else:
                # Managers ONLY see their own team members
                users_qs = User.objects.filter(is_active=True, manager=user)
            
            dept = request.query_params.get('department')
            if dept:
                users_qs = users_qs.filter(department_id=dept)
        else:
            # Employees see the full leaderboard (anonymized names handled below)
            # but we can also restrict this to their manager's team if desired.
            # For now, let's keep it global but anonymized as per previous logic.
            users_qs = User.objects.filter(is_active=True, role='employee')

        data = []
        for u in users_qs:
            tasks = Task.objects.filter(
                assignee=u,
                created_at__date__gte=start,
                created_at__date__lte=end,
            )
            total = tasks.count()
            completed = tasks.filter(status='completed').count()
            rate = round((completed / total * 100), 1) if total else 0
            hours = tasks.aggregate(h=Sum('actual_hours'))['h'] or 0
            chekclist_days = DailyChecklist.objects.filter(
                user=u, date__gte=start, date__lte=end
            ).values('date').distinct().count()
            total_reward_amount = float(
                Reward.objects.filter(recipient=u).aggregate(t=Sum('amount'))['t'] or 0
            )

            # Anonymize real names for the leaderboard view unless checking self or admin
            if user.is_manager_or_above() or u.id == user.id:
                 display_name = u.full_name
            else:
                 display_name = "Employee"

            data.append({
                'user_id': u.id,
                'name': display_name,
                'role': u.role,
                'department': u.department.name if u.department else None,
                'team_id': u.manager_id,
                'total_tasks': total,
                'completed_tasks': completed,
                'completion_rate': rate,
                'actual_hours': float(hours),
                'active_days': chekclist_days,
                'total_reward_amount': total_reward_amount,
            })

        # Calculate team stats
        team_stats = {}
        for d in data:
            tid = d['team_id'] or 'Unassigned'
            if tid not in team_stats:
                 team_stats[tid] = {'total': 0, 'completed': 0, 'name': f"Team {tid}"}
            team_stats[tid]['total'] += d['total_tasks']
            team_stats[tid]['completed'] += d['completed_tasks']
        
        for k, v in team_stats.items():
            if v['total'] > 0:
                v['rate'] = round((v['completed'] / v['total'] * 100), 1)
            else:
                v['rate'] = 0

        return Response({
            'period': {'start': start, 'end': end},
            'employees': data,
            'teams': list(team_stats.values()),
        })


class ReportExportView(APIView):
    """
    GET /api/reports/export/?type=tasks&format=csv
    Export tasks or productivity report as CSV.
    """
    def get(self, request):
        export_type = request.query_params.get('type', 'tasks')
        start, end = _parse_date_range(request)
        user = request.user

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="ems_{export_type}_report.csv"'
        writer = csv.writer(response)

        if export_type == 'tasks':
            qs = Task.objects.filter(created_at__date__gte=start, created_at__date__lte=end)
            if not user.is_manager_or_above():
                qs = qs.filter(Q(assignee=user) | Q(supervisor=user))
            writer.writerow([
                'ID', 'Title', 'Status', 'Priority', 'Assignee',
                'Estimated Hours', 'Actual Hours', 'End Date', 'Sprint', 'Created At'
            ])
            for task in qs:
                writer.writerow([
                    task.id, task.title, task.status, task.priority,
                    task.assignee.full_name if task.assignee else '',
                    task.estimated_hours, task.actual_hours, task.end_date,
                    task.sprint.name if task.sprint else '',
                    task.created_at.strftime('%Y-%m-%d'),
                ])
        elif export_type == 'productivity':
            writer.writerow([
                'Name', 'Role', 'Department', 'Total Tasks',
                'Completed', 'Completion Rate %', 'Actual Hours'
            ])
            users_qs = User.objects.filter(is_active=True)
            if not user.is_manager_or_above():
                users_qs = users_qs.filter(pk=user.pk)
            for u in users_qs:
                tasks = Task.objects.filter(
                    assignee=u, created_at__date__gte=start, created_at__date__lte=end
                )
                total = tasks.count()
                done = tasks.filter(status='completed').count()
                rate = round(done / total * 100, 1) if total else 0
                hours = tasks.aggregate(h=Sum('actual_hours'))['h'] or 0
                writer.writerow([
                    u.full_name, u.role,
                    u.department.name if u.department else '',
                    total, done, rate, float(hours),
                ])

        return response


class DashboardSummaryView(APIView):
    """GET /api/reports/dashboard/ — quick stats for the home page."""

    def get(self, request):
        user = request.user
        today = date.today()

        if user.role == 'admin':
            relevant_tasks = Task.objects.all()
        elif user.role == 'manager':
            # Managers see their own tasks, tasks supervised by them, and tasks assigned to their subordinates
            relevant_tasks = Task.objects.filter(
                Q(assignee=user) | Q(supervisor=user) | Q(assignee__manager=user)
            ).distinct()
        else:
            relevant_tasks = Task.objects.filter(assignee=user)

        today_checklist = DailyChecklist.objects.filter(user=user, date=today)
        today_meetings = Meeting.objects.filter(
            Q(created_by=user) | Q(participants__user=user), date=today
        ).distinct()

        unread_notifications = user.notifications.filter(is_read=False).count()

        if user.role in ('manager', 'admin'):
            pending_review_count = Task.objects.filter(supervisor=user, status='pending_review').count()
        else:
            pending_review_count = relevant_tasks.filter(status='pending_review').count()

        return Response({
            'tasks': {
                'total': relevant_tasks.count(),
                'completed': relevant_tasks.filter(status='completed').count(),
                'in_progress': relevant_tasks.filter(status='in_progress').count(),
                'assigned': relevant_tasks.filter(status='assigned').count(),
                'pending_review': pending_review_count,
                'overdue': relevant_tasks.filter(
                    status__in=['assigned', 'in_progress'],
                    end_date__lt=today
                ).count(),
            },
            'today': {
                'checklist_total': today_checklist.count(),
                'checklist_completed': today_checklist.filter(is_completed=True).count(),
                'planned_hours': float(
                    today_checklist.aggregate(h=Sum('planned_hours'))['h'] or 0
                ),
                'meetings': today_meetings.count(),
            },
            'notifications': {
                'unread': unread_notifications,
            },
        })
