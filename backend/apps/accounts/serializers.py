from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Department, WorkLog


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'description']


class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    full_name = serializers.ReadOnlyField()
    work_hours_today = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'department', 'department_name', 'phone', 'avatar',
            'job_title', 'hourly_rate', 'manager', 'manager_name', 'is_active',
            'date_joined', 'work_hours_today'
        ]
        read_only_fields = ['id', 'date_joined']

    def get_work_hours_today(self, obj):
        from django.utils import timezone
        today = timezone.localdate()
        logs = WorkLog.objects.filter(user=obj, date=today)
        total_seconds = 0
        for log in logs:
            start = log.login_time
            end = log.logout_time or timezone.now()
            if start:
                total_seconds += (end - start).total_seconds()
        hours, remainder = divmod(total_seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        return f"{int(hours)}h {int(minutes)}m"


class UserMiniSerializer(serializers.ModelSerializer):
    """Lightweight serializer for nested / dropdown use."""
    full_name = serializers.ReadOnlyField()
    department = DepartmentSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    work_hours_today = serializers.SerializerMethodField()
    active_session = serializers.SerializerMethodField()
    today_sessions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'first_name', 'last_name', 'email', 'role',
            'avatar', 'job_title', 'department', 'department_name',
            'work_hours_today', 'active_session', 'today_sessions'
        ]

    def get_work_hours_today(self, obj):
        from django.utils import timezone
        from .models import WorkLog
        today = timezone.localdate()
        logs = WorkLog.objects.filter(user=obj, date=today)
        total_seconds = 0
        for log in logs:
            start = log.login_time
            end = log.logout_time or timezone.now()
            if start:
                total_seconds += (end - start).total_seconds()
        hours, remainder = divmod(total_seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        return f"{int(hours)}h {int(minutes)}m"

    def get_active_session(self, obj):
        from .models import WorkLog
        return WorkLog.objects.filter(user=obj, logout_time__isnull=True).exists()

    def get_today_sessions(self, obj):
        from django.utils import timezone
        from .models import WorkLog
        today = timezone.localdate()
        logs = WorkLog.objects.filter(user=obj, date=today).order_by('login_time')
        sessions = []
        for log in logs:
            if not log.login_time:
                continue
            local_login = timezone.localtime(log.login_time)
            local_logout = timezone.localtime(log.logout_time) if log.logout_time else None
            sessions.append({
                "login": local_login.strftime("%I:%M %p"),
                "logout": local_logout.strftime("%I:%M %p") if local_logout else "Active"
            })
        return sessions


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password2', 'role', 'department', 'job_title',
        ]

    def validate_email(self, value):
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password2': "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        user = authenticate(request=self.context.get('request'), username=email, password=password)
        
        if not user:
            raise serializers.ValidationError("Invalid email or password.")
            
        if not user.is_active:
            raise serializers.ValidationError("Account is deactivated.")
            
        attrs['user'] = user
        return attrs




class TokenResponseSerializer(serializers.Serializer):
    """Used only for documentation."""
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class WorkLogSerializer(serializers.ModelSerializer):
    duration = serializers.SerializerMethodField()

    class Meta:
        model = WorkLog
        fields = ['id', 'login_time', 'logout_time', 'date', 'duration']

    def get_duration(self, obj):
        if obj.logout_time:
            diff = obj.logout_time - obj.login_time
            hours, remainder = divmod(diff.total_seconds(), 3600)
            minutes, _ = divmod(remainder, 60)
            return f"{int(hours)}h {int(minutes)}m"
        return "Active"
