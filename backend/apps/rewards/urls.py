from django.urls import path
from .views import RewardListCreateView, LeaderboardView, MyRewardsView

urlpatterns = [
    path('', RewardListCreateView.as_view(), name='reward-list'),
    path('my/', MyRewardsView.as_view(), name='my-rewards'),
    path('leaderboard/', LeaderboardView.as_view(), name='reward-leaderboard'),
]
