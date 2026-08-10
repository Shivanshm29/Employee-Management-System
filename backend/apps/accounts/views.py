from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django.utils import timezone
from .models import User, Department, WorkLog
from .serializers import (
    UserSerializer, UserMiniSerializer, DepartmentSerializer,
    RegisterSerializer, LoginSerializer, WorkLogSerializer,
    get_tokens_for_user,
)
from .permissions import IsHROrAdmin


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            **tokens,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Create WorkLog entry
        WorkLog.objects.create(user=user)
        
        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            **tokens,
        })


class LogoutView(APIView):
    def post(self, request):
        # Update WorkLog
        user = request.user
        if user.is_authenticated:
            last_log = WorkLog.objects.filter(user=user, logout_time__isnull=True).first()
            if last_log:
                last_log.logout_time = timezone.now()
                last_log.save()

        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({'detail': 'Successfully logged out.'})


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    serializer_class = UserMiniSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_qs = User.objects.filter(is_active=True).select_related(
            'department', 'manager'
        ).prefetch_related('work_logs')

        if user.role == 'admin':
            return base_qs
        elif user.role == 'manager':
            # Managers see themselves + their subordinates
            return base_qs.filter(
                Q(id=user.id) | Q(manager=user)
            ).distinct()
        else:
            # Employees see themselves + their manager + their teammates
            return base_qs.filter(
                Q(id=user.id) | Q(id=user.manager_id) | Q(manager=user.manager)
            ).distinct()


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance != request.user and not request.user.is_manager_or_above():
            return Response(
                {'error': 'Permission denied.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)


class DepartmentListView(generics.ListCreateAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsHROrAdmin()]
        return [permissions.AllowAny()]


class WorkLogListView(generics.ListAPIView):
    serializer_class = WorkLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Ensure a session is active when viewing the log
        if user.is_authenticated:
            active_log = WorkLog.objects.filter(user=user, logout_time__isnull=True).exists()
            if not active_log:
                WorkLog.objects.create(user=user)
        
        return WorkLog.objects.filter(user=user)
