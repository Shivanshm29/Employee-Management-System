from django.db import models
from django.conf import settings


class ChatRoom(models.Model):
   
    ROOM_TYPE_CHOICES = [
        ('team', 'Team Room'),   
        ('global', 'Global'),     
        ('direct', 'Direct'),      
    ]

    name = models.CharField(max_length=200)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='team')


    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='managed_chat_rooms'
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name='chat_rooms'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.room_type})"

    class Meta:
        ordering = ['name']


class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='sent_messages'
    )
    content = models.TextField()
    is_broadcast = models.BooleanField(default=False)  # manager-to-all broadcast
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.room.name}] {self.sender}: {self.content[:50]}"

    class Meta:
        ordering = ['created_at']
