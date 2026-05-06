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

from django.utils import timezone

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

# --- NEW RECONSTRUCTED VERIFICATION VIEWS ---

class SendOTPView(APIView):
    """
    Directly dispatch a 6-digit verification code to any email.
    Used during member creation to verify identity.
    """
    permission_classes = [permissions.IsAuthenticated, IsHRManagement]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_code = f"{random.randint(100000, 999999)}"
        
        # Save to database for verification
        EmailOTP.objects.create(email=email, otp=otp_code)

        # Direct High-Priority Transmission (No silent fail)
        try:
            send_mail(
                subject='Welcome to Colour Parrot! - Your Tactical Clearance Code',
                message=(
                    f'Hello,\n\n'
                    'You are being recruited to the Colour Parrot Command Center. '
                    f'Your unique tactical clearance code is: {otp_code}\n\n'
                    'System Portal: https://c1r9rt-workflow.in\n\n'
                    'Please enter this code on the verification screen to finalize your account setup.\n\n'
                    'Best regards,\n'
                    'The Colour Parrot Team'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            return Response({
                'detail': f'Clearance code CODE: {otp_code} dispatched successfully.',
                'otp_sent': True,
                'otp': otp_code
            })
        except Exception as e:
            # Fallback for UI if email fails but we want to allow the Admin to see the code
            error_msg = str(e)
            print(f"SMTP FAILURE: {error_msg}")
            # Returning 200 with otp_fallback so the frontend can display the code manually
            return Response({
                'detail': f'CODE: {otp_code} (Mail Server Busy - Use Manual Code)',
                'otp_fallback': True,
                'otp': otp_code
            }, status=status.HTTP_200_OK)

class VerifyOTPActionView(APIView):
    """
    Verify the dispatched code to finalize member clearance.
    """
    permission_classes = [permissions.IsAuthenticated, IsHRManagement]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp_code = request.data.get('otp', '').strip()

        if not email or not otp_code:
            return Response({'detail': 'Email and code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = EmailOTP.objects.filter(email=email, otp=otp_code, is_used=False).first()

        if not otp_record or not otp_record.is_valid():
            return Response({'detail': 'Invalid or expired clearance code.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record.is_used = True
        otp_record.save()

        return Response({'detail': 'Identity verified. Member cleared for creation.', 'verified': True})
