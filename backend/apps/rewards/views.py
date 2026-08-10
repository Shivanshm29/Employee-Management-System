from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count
from django.contrib.auth import get_user_model

from .models import Reward
from .serializers import RewardSerializer
from apps.notifications.models import Notification

User = get_user_model()


class RewardListCreateView(generics.ListCreateAPIView):
    serializer_class = RewardSerializer
    filterset_fields = ['reward_type', 'recipient']
    search_fields = ['title', 'message']

    def get_queryset(self):
        return Reward.objects.all().select_related('recipient', 'given_by')

    def perform_create(self, serializer):
        reward = serializer.save(given_by=self.request.user)
        # Notify recipient
        Notification.objects.create(
            user=reward.recipient,
            title=f'You received a {reward.get_reward_type_display()}!',
            message=f'{reward.given_by.full_name} gave you "{reward.title}": {reward.message}',
            notification_type='general',
            related_id=reward.id,
        )


class MyRewardsView(APIView):
    """GET /api/rewards/my/ — rewards earned by the current user."""

    def get(self, request):
        rewards = Reward.objects.filter(
            recipient=request.user
        ).select_related('given_by').order_by('-created_at')

        totals = rewards.aggregate(
            total_amount=Sum('amount'),
            total_points=Sum('points'),
        )

        return Response({
            'total_amount': float(totals['total_amount'] or 0),
            'total_points': totals['total_points'] or 0,
            'count': rewards.count(),
            'rewards': RewardSerializer(rewards, many=True).data,
        })


class LeaderboardView(APIView):
    """GET /api/rewards/leaderboard/ — top employees by points and rewards."""

    def get(self, request):
        data = (
            Reward.objects
            .values('recipient__id', 'recipient__first_name', 'recipient__last_name')
            .annotate(
                total_points=Sum('points'),
                reward_count=Count('id'),
                total_amount=Sum('amount'),
            )
            .order_by('-total_points', '-total_amount')[:20]
        )
        result = [
            {
                'user_id': row['recipient__id'],
                'name': f"{row['recipient__first_name']} {row['recipient__last_name']}".strip(),
                'total_points': row['total_points'] or 0,
                'reward_count': row['reward_count'],
                'total_amount': float(row['total_amount'] or 0),
            }
            for row in data
        ]
        return Response(result)
