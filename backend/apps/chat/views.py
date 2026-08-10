from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import ChatRoom, ChatMessage
from .serializers import ChatRoomSerializer, ChatMessageSerializer


class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Ensure a global room exists
        ChatRoom.objects.get_or_create(
            room_type='global',
            defaults={'name': 'General Announcements'}
        )

        if user.role == 'admin':
            return ChatRoom.objects.all()

        if user.role == 'manager':
            # Ensure this manager has a team room
            ChatRoom.objects.get_or_create(
                manager=user,
                room_type='team',
                defaults={'name': f"Team {user.last_name}'s Hub"}
            )
            # Managers see: Team Hubs (managed by them), Global rooms, and Direct rooms they are part of
            return ChatRoom.objects.filter(
                Q(manager=user) | 
                Q(room_type='global') | 
                Q(members=user)
            ).distinct()
        else:
            # For employees, ensure their manager's team room exists
            if user.manager:
                ChatRoom.objects.get_or_create(
                    manager=user.manager,
                    room_type='team',
                    defaults={'name': f"Team {user.manager.last_name}'s Hub"}
                )
            # Employees see: Their Team Hub, Global rooms, and Direct rooms they are part of
            return ChatRoom.objects.filter(
                Q(room_type='global') | 
                Q(manager=user.manager) |
                Q(members=user)
            ).distinct()

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['get'], url_path='messages')
    def messages(self, request, pk=None):
        room = self.get_object()
        msgs = room.messages.order_by('-created_at')[:50]  # last 50
        # Return in chronological order
        return Response(ChatMessageSerializer(reversed(msgs), many=True).data)

    @action(detail=False, methods=['post'], url_path='get-or-create-direct')
    def get_or_create_direct(self, request):
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return Response({'error': 'user_id is required.'}, status=400)
            
        from apps.accounts.models import User
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

        if target_user == request.user:
            return Response({'error': 'Cannot chat with yourself.'}, status=400)

        # Check for existing direct room
        room = ChatRoom.objects.filter(
            room_type='direct'
        ).filter(
            members=request.user
        ).filter(
            members=target_user
        ).first()

        if not room:
            # Create new direct room
            room = ChatRoom.objects.create(
                name=f"Direct: {request.user.last_name} & {target_user.last_name}",
                room_type='direct'
            )
            room.members.add(request.user, target_user)

        return Response(ChatRoomSerializer(room).data)

    @action(detail=False, methods=['post'], url_path='broadcast')
    def broadcast(self, request):
        if not request.user.role in ('manager', 'admin'):
            return Response({'error': 'Only managers can broadcast.'}, status=status.HTTP_403_FORBIDDEN)
        
        content = request.data.get('content')
        if not content:
            return Response({'error': 'Message content is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Broadcast goes to the 'global' room or specific room if provided
        room_id = request.data.get('room_id')
        if room_id:
            try:
                room = ChatRoom.objects.get(id=room_id)
            except ChatRoom.DoesNotExist:
                return Response({'error': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            room, _ = ChatRoom.objects.get_or_create(
                room_type='global',
                defaults={'name': 'General Announcements'}
            )

        msg = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            content=content,
            is_broadcast=True
        )

        return Response(ChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)
