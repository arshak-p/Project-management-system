import os
import re

base_dir = r'd:\c p web\web site code CP\python\accounts'

# 1. Update accounts/serializers.py
serializers_path = os.path.join(base_dir, 'serializers.py')
with open(serializers_path, 'r', encoding='utf-8') as f:
    serializers_content = f.read()

serializers_content = serializers_content.replace(
    '"last_name": user.last_name,',
    '"last_name": user.last_name,\n            "is_verified": user.is_verified,'
)
with open(serializers_path, 'w', encoding='utf-8') as f:
    f.write(serializers_content)

# 2. Update accounts/urls.py
urls_path = os.path.join(base_dir, 'urls.py')
with open(urls_path, 'r', encoding='utf-8') as f:
    urls_content = f.read()

urls_content = urls_content.replace(
    'from .views import LoginView, RefreshView, CreateUserView,',
    'from .views import LoginView, RefreshView, CreateUserView, ActivateAccountView, ResendActivationEmailView,'
)
urls_content = urls_content.replace(
    "path('create-user/', CreateUserView.as_view(), name='create_user'),",
    "path('create-user/', CreateUserView.as_view(), name='create_user'),\n    path('activate/', ActivateAccountView.as_view(), name='activate_account'),\n    path('resend-activation/', ResendActivationEmailView.as_view(), name='resend_activation'),"
)
with open(urls_path, 'w', encoding='utf-8') as f:
    f.write(urls_content)

# 3. Update accounts/views.py
views_path = os.path.join(base_dir, 'views.py')
with open(views_path, 'r', encoding='utf-8') as f:
    views_content = f.read()

import_str = "from django.contrib.auth.tokens import default_token_generator"
if import_str not in views_content:
    views_content = views_content.replace(
        'from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView',
        f'from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView\nfrom rest_framework_simplejwt.tokens import RefreshToken\n{import_str}'
    )

create_user_old = """        # Check if email is verified
        from django.utils import timezone
        import datetime
        fifteen_mins_ago = timezone.now() - datetime.timedelta(minutes=15)
        is_verified = EmailOTP.objects.filter(
            email=email, 
            is_used=True, 
            created_at__gte=fifteen_mins_ago
        ).exists()
        
        if not is_verified:
            return Response({'detail': 'Email verification required before creating this account.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except Exception as e:
            return Response({'detail': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)"""

create_user_new = """        # Bypassing OTP check for admins. Setting up magic link activation flow."""

views_content = views_content.replace(create_user_old, create_user_new)

email_block_old = """        if date_joined:
            user.date_joined = date_joined
        user.set_password(password)
        user._activity_user = request.user
        user.save()

        # Instant Async Welcome Email
        send_reliable_email_async(
            subject='Welcome to Colour Parrot - Your Account is Ready!',
            message=(
                f'Hello {first_name},\\n\\n'
                'Your account on the Colour Parrot Task Management System has been created.\\n\\n'
                'System Portal: https://c1r9rt-workflow.in\\n'
                f'Login Email: {email}\\n\\n'
                'You can now log in and start collaborating on your assigned projects.\\n\\n'
                'Best regards,\\n'
                'The Colour Parrot Team'
            ),
            recipient_list=[email]
        )"""

email_block_new = """        if date_joined:
            user.date_joined = date_joined
        user.set_unusable_password()
        user.is_verified = False
        user._activity_user = request.user
        user.save()

        token = default_token_generator.make_token(user)
        activation_url = f"https://c1r9rt-workflow.in/activate?email={user.email}&token={token}"

        # Instant Async Welcome Email
        send_reliable_email_async(
            subject='Welcome to Colour Parrot - Activate Your Account',
            message=(
                f'Hello {first_name},\\n\\n'
                'Your account on the Colour Parrot Task Management System has been created.\\n\\n'
                'Please click the link below to verify your email and set your password to activate your account:\\n'
                f'{activation_url}\\n\\n'
                'Best regards,\\n'
                'The Colour Parrot Team'
            ),
            recipient_list=[email]
        )"""

views_content = views_content.replace(email_block_old, email_block_new)

new_views = """
class ActivateAccountView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        token = request.data.get('token', '')
        new_password = request.data.get('new_password', '')

        if not email or not token or not new_password:
            return Response({'detail': 'Email, token, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid activation link.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_verified:
            return Response({'detail': 'Account is already activated.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'Invalid or expired activation link.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.contrib.auth.password_validation import validate_password
            validate_password(new_password, user=user)
        except Exception as e:
            return Response({'detail': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.is_verified = True
        user.save()

        # Generate tokens for auto-login
        refresh = RefreshToken.for_user(user)
        refresh["role"] = getattr(user, "role", "")
        refresh["name"] = user.get_full_name() or user.email
        refresh["email"] = user.email

        return Response({
            'detail': 'Account activated successfully.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })

class ResendActivationEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsHRManagement]

    def post(self, request):
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        if user.is_verified:
            return Response({'detail': 'User is already activated.'}, status=status.HTTP_400_BAD_REQUEST)

        token = default_token_generator.make_token(user)
        activation_url = f"https://c1r9rt-workflow.in/activate?email={user.email}&token={token}"

        send_reliable_email_async(
            subject='Reminder: Activate Your Colour Parrot Account',
            message=(
                f'Hello {user.first_name},\\n\\n'
                'Your account on the Colour Parrot Task Management System is waiting to be activated.\\n\\n'
                'Please click the link below to verify your email and set your password to activate your account:\\n'
                f'{activation_url}\\n\\n'
                'Best regards,\\n'
                'The Colour Parrot Team'
            ),
            recipient_list=[user.email]
        )
        return Response({'detail': 'Activation email resent successfully.'})
"""
views_content += new_views

with open(views_path, 'w', encoding='utf-8') as f:
    f.write(views_content)
print("Backend updated.")
