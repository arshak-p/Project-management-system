import random
from django.conf import settings
from django.core.mail import send_mail
import threading
from django.contrib.auth.password_validation import validate_password
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.models import User, EmailOTP
from accounts.serializers import CustomTokenObtainPairSerializer
from tms.permissions import IsAdminRole, IsHRManagement

import threading

def send_reliable_email_async(subject, message, recipient_list):
    """Fires the email into a background thread and returns instantly."""
    def send():
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipient_list,
                fail_silently=False,
            )
        except Exception as e:
            print(f"THREADED SMTP ERROR: {str(e)}")

    thread = threading.Thread(target=send, daemon=True)
    thread.start()
    return True


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RefreshView(TokenRefreshView):
    pass


class CreateUserView(APIView):
    """Admin-only: create a new team member with a password."""
    permission_classes = [permissions.IsAuthenticated, IsHRManagement]

    def post(self, request):
        data = request.data
        email = data.get('email', '').strip()
        password = data.get('password', '')
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        role = data.get('role', User.Role.SPECIALIST)
        title = data.get('title', '').strip()
        phone = data.get('phone', '').strip()
        date_joined = data.get('date_joined')
        dob = data.get('date_of_birth')

        if not email or not password:
            return Response({'detail': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'detail': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except Exception as e:
            return Response({'detail': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        username = email.split('@')[0]
        base = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base}{counter}'
            counter += 1

        user = User(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=role,
            title=title,
            phone=phone,
            date_of_birth=dob if dob else None,
        )
        if date_joined:
            user.date_joined = date_joined
        user.set_password(password)
        user._activity_user = request.user
        user.save()

        # Instant Async Welcome Email
        send_reliable_email_async(
            subject='Welcome to Colour Parrot - Your Account is Ready!',
            message=(
                f'Hello {first_name},\n\n'
                'Your account on the Colour Parrot Task Management System has been created.\n\n'
                'System Portal: https://c1r9rt-workflow.in\n'
                f'Login Email: {email}\n\n'
                'You can now log in and start collaborating on your assigned projects.\n\n'
                'Best regards,\n'
                'The Colour Parrot Team'
            ),
            recipient_list=[email]
        )

        return Response({
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_verified': user.is_verified,
        }, status=status.HTTP_201_CREATED)

from django.utils import timezone

@method_decorator(csrf_exempt, name='dispatch')
class RequestOTPView(APIView):
    """Generate and send a 6-digit OTP to the user's email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user exists
        if not User.objects.filter(email=email, is_active=True).exists():
            return Response({'detail': 'No active account found with this email.'}, status=status.HTTP_404_NOT_FOUND)

        # Generate 6-digit OTP
        otp_code = f"{random.randint(100000, 999999)}"
        
        # Save OTP to database
        EmailOTP.objects.create(email=email, otp=otp_code)

        # Send Email (Fallback to console if SMTP not configured)
        # Instant Async OTP Email
        send_reliable_email_async(
            subject='Colour Parrot Security Code',
            message=f'Your secure login code is: {otp_code}. It will expire in 10 minutes.',
            recipient_list=[email]
        )
        return Response({'detail': 'OTP sent successfully.'})


@method_decorator(csrf_exempt, name='dispatch')
class VerifyOTPView(APIView):
    """Verify OTP and issue JWT tokens."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp_code = request.data.get('otp', '').strip()

        if not email or not otp_code:
            return Response({'detail': 'Email and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = EmailOTP.objects.filter(email=email, otp=otp_code, is_used=False).first()

        if not otp_record or not otp_record.is_valid():
            return Response({'detail': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark OTP as used
        otp_record.is_used = True
        otp_record.save()

        # Get user and issue tokens
        user = User.objects.get(email=email)
        
        # Mark as verified
        if not user.is_verified:
            user.is_verified = True
            user.save()

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'first_name': user.first_name,
            }
        })

class SendCreationOTPView(APIView):
    """Send OTP to a brand new email before user creation."""
    permission_classes = [permissions.IsAuthenticated, IsHRManagement]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 6-digit OTP
        otp_code = f"{random.randint(100000, 999999)}"
        EmailOTP.objects.create(email=email, otp=otp_code)

        # Instant Async Creation OTP
        send_reliable_email_async(
            subject='Colour Parrot: Verify Team Member Email',
            message=f'You are being added to the Colour Parrot TMS. Your verification code is: {otp_code}.',
            recipient_list=[email]
        )
        return Response({
            'detail': f'Code sent to email. (Admin Backup Code: {otp_code})',
            'otp_fallback': otp_code
        })


class VerifyCreationOTPView(APIView):
    """Verify OTP for a new email before creation."""
    permission_classes = [permissions.IsAuthenticated, IsHRManagement]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp_code = request.data.get('otp', '').strip()

        if not email or not otp_code:
            return Response({'detail': 'Email and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = EmailOTP.objects.filter(email=email, otp=otp_code, is_used=False).first()

        if not otp_record or not otp_record.is_valid():
            return Response({'detail': 'Invalid or expired code.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record.is_used = True
        otp_record.save()

        return Response({'detail': 'Email verified successfully.', 'verified': True})
