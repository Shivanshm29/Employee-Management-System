from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        unread_only = self.request.query_params.get('unread', 'false').lower() == 'true'
        if unread_only:
            qs = qs.filter(is_read=False)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        response.data = {
            'unread_count': unread_count,
            'notifications': response.data,
        }
        return response


@api_view(['POST'])
def mark_read(request, pk):
    try:
        n = Notification.objects.get(pk=pk, user=request.user)
        n.is_read = True
        n.save(update_fields=['is_read'])
        return Response({'status': 'ok'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found.'}, status=404)


@api_view(['POST'])
def mark_all_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'all marked read'})
