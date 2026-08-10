from rest_framework import permissions


class IsManagerOrAbove(permissions.BasePermission):
    """Allow access only to managers, HR, and admins."""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ('manager', 'admin')
        )


class IsHROrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


class IsOwnerOrManagerOrAbove(permissions.BasePermission):
    """Owner can access, or manager/hr/admin."""
    def has_object_permission(self, request, view, obj):
        if request.user.role in ('manager', 'admin'):
            return True
        # Check if the object has 'assignee' or 'user' or 'created_by' field
        for field in ('assignee', 'user', 'created_by', 'author'):
            owner = getattr(obj, field, None)
            if owner == request.user:
                return True
        return False


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'
