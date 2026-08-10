import os
import sys
import json
import jwt
import django
from django.conf import settings
from websocket_server import WebsocketServer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.chat.models import ChatRoom, ChatMessage
from django.contrib.auth import get_user_model

User = get_user_model()

# Connected clients map: { client_id: {'user': user_obj, 'handler': client_dict} }
clients = {}

def get_user_from_token(token):
    """Parses a JWT token to authenticate the user."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return User.objects.get(id=payload['user_id'])
    except Exception as e:
        print(f"[AUTH] Error decoding token: {e}")
        return None

def new_client(client, server):
    print(f"[SERVER] Client {client['id']} connected.")

def client_left(client, server):
    print(f"[SERVER] Client {client['id']} disconnected.")
    clients.pop(client['id'], None)

def message_received(client, server, message):
    try:
        data = json.loads(message)
    except Exception:
        print(f"[SERVER] Invalid JSON received from client {client['id']}")
        return

    if data.get('type') == 'authenticate':
        token = data.get('token')
        user = get_user_from_token(token)
        
        if user:
            clients[client['id']] = {'user': user, 'handler': client}
            print(f"[AUTH] User {user.email} successfully authenticated.")
            server.send_message(client, json.dumps({
                'type': 'auth_success',
                'user_id': user.id
            }))
        else:
            server.send_message(client, json.dumps({'type': 'auth_failed'}))
        return

    if client['id'] not in clients:
        print(f"[SERVER] Unauthorized message from client {client['id']}. Ignored.")
        return
    
    sender_user = clients[client['id']]['user']
    
    if data.get('type') == 'chat_message':
        room_id = data.get('room_id')
        content = data.get('content')
        
        print(f"[CHAT] Message from {sender_user.email} in room {room_id}")

        try:
            room = ChatRoom.objects.get(id=room_id)
            msg = ChatMessage.objects.create(
                room=room, 
                sender=sender_user, 
                content=content
            )
            
            broadcast_payload = json.dumps({
                'type': 'chat_message',
                'message': {
                    'id': msg.id,
                    'room': room_id,
                    'sender': sender_user.id,
                    'sender_name': sender_user.full_name,
                    'content': content,
                    'is_broadcast': False,
                    'created_at': msg.created_at.isoformat()
                }
            })
            
            for c_id in clients:
                server.send_message(clients[c_id]['handler'], broadcast_payload)
                
        except ChatRoom.DoesNotExist:
            print(f"[ERROR] Room {room_id} not found.")
        except Exception as e:
            print(f"[ERROR] Chat processing error: {e}")

PORT = 8001
server = WebsocketServer(host='0.0.0.0', port=PORT)
server.set_fn_new_client(new_client)
server.set_fn_client_left(client_left)
server.set_fn_message_received(message_received)

print(f"WebSocket server running on port {PORT}")
server.run_forever()
