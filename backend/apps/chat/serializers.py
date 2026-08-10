from rest_framework import serializers
from .models import ChatRoom, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_avatar_initial = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ['id', 'room', 'sender', 'sender_name', 'sender_avatar_initial',
                  'content', 'is_broadcast', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']

    def get_sender_avatar_initial(self, obj):
        if obj.sender:
            return (obj.sender.first_name or obj.sender.email or '?')[0].upper()
        return '?'


class ChatRoomSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'name', 'display_name', 'room_type', 'manager', 'last_message', 'unread_count']

    def get_display_name(self, obj):
        user = self.context.get('request').user
        if obj.room_type == 'direct' and user:
            other_member = obj.members.exclude(id=user.id).first()
            if other_member:
                return other_member.full_name
        return obj.name

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return {
                'content': msg.content[:80],
                'sender_name': msg.sender.full_name if msg.sender else 'System',
                'created_at': msg.created_at,
            }
        return None

    def get_unread_count(self, obj):
        # Simplified — always 0 for now (can add read-receipts later)
        return 0
