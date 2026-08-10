from rest_framework import serializers
from .models import Reward
from apps.accounts.serializers import UserMiniSerializer


class RewardSerializer(serializers.ModelSerializer):
    recipient_detail = UserMiniSerializer(source='recipient', read_only=True)
    given_by_detail = UserMiniSerializer(source='given_by', read_only=True)

    class Meta:
        model = Reward
        fields = [
            'id', 'recipient', 'recipient_detail', 'given_by', 'given_by_detail',
            'reward_type', 'title', 'message', 'points', 'amount', 'created_at',
        ]
        read_only_fields = ['id', 'given_by', 'created_at']


class LeaderboardSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    name = serializers.CharField()
    total_points = serializers.IntegerField()
    reward_count = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
