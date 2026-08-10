from django.urls import path
from .views import (
    TaskReportView, ProductivityReportView,
    ReportExportView, DashboardSummaryView,
)

urlpatterns = [
    path('tasks/', TaskReportView.as_view(), name='report-tasks'),
    path('productivity/', ProductivityReportView.as_view(), name='report-productivity'),
    path('export/', ReportExportView.as_view(), name='report-export'),
    path('dashboard/', DashboardSummaryView.as_view(), name='report-dashboard'),
]
