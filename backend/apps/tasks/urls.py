from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SprintViewSet, TaskViewSet,
    DailyChecklistView, DailyChecklistDetailView, ChecklistCompleteView,
)

router = DefaultRouter()
router.register(r'sprints', SprintViewSet, basename='sprint')
router.register(r'', TaskViewSet, basename='task')

urlpatterns = [
    path('checklist/', DailyChecklistView.as_view(), name='checklist'),
    path('checklist/<int:pk>/', DailyChecklistDetailView.as_view(), name='checklist-detail'),
    path('checklist/<int:pk>/complete/', ChecklistCompleteView.as_view(), name='checklist-complete'),
    path('', include(router.urls)),
]
