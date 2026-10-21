from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.models import User
from accounts.serializers import CustomTokenObtainPairSerializer
from tms.permissions import IsAdminRole


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_scope = "login"


class RefreshView(TokenRefreshView):
    throttle_scope = "refresh"


class CreateUserView(APIView):
    """Admin-only: create a new team member with a password."""
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request):
        data = request.data
        email = str(data.get('email', '')).strip().lower()
        password = data.get('password', '')
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        role = data.get('role', User.Role.SPECIALIST)
        title = data.get('title', '').strip()
        phone = data.get('phone', '').strip()

        if not email or not password:
            return Response({'detail': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_email(email)
        except ValidationError:
            return Response({'detail': 'Enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        if role not in User.Role.values:
            return Response({'detail': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'detail': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except ValidationError as e:
            return Response({'detail': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        username = email.split('@')[0]
        base = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base}{counter}'
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            title=title,
            phone=phone,
        )
        return Response({
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
        }, status=status.HTTP_201_CREATED)


class ChangePasswordView(APIView):
    """Any signed-in user can change their own password."""
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "login"

    def post(self, request):
        old = request.data.get('old_password', '')
        new = request.data.get('new_password', '')
        if not request.user.check_password(old):
            return Response({'detail': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new, request.user)
        except ValidationError as e:
            return Response({'detail': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new)
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password updated.'})
