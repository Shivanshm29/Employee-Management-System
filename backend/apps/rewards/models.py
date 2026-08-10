from django.db import models
from django.conf import settings


class Reward(models.Model):
    REWARD_TYPE = [
        ('recognition', 'Recognition'),
        ('appreciation', 'Appreciation'),
        ('award', 'Award'),
        ('bonus', 'Bonus'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rewards_received'
    )
    given_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='rewards_given'
    )
    reward_type = models.CharField(max_length=20, choices=REWARD_TYPE, default='recognition')
    title = models.CharField(max_length=255)
    message = models.TextField()
    points = models.PositiveIntegerField(default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Monetary reward amount in ₹')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reward_type}: {self.title} → {self.recipient}"
