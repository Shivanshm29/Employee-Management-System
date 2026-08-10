from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/tasks/', include('apps.tasks.urls')),
    path('api/tickets/', include('apps.tickets.urls')),
    path('api/meetings/', include('apps.meetings.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/rewards/', include('apps.rewards.urls')),
    path('api/chat/', include('apps.chat.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
