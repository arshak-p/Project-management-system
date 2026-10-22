import re

# Update accounts/urls.py
with open('accounts/urls.py', 'r') as f:
    urls_content = f.read()

urls_content = re.sub(r"path\('activate/',.*?\n", "", urls_content)
urls_content = re.sub(r"path\('resend-activation/',.*?\n", "", urls_content)
urls_content = re.sub(r",\s*ActivateAccountView,\s*ResendActivationEmailView", "", urls_content)
urls_content = re.sub(r"ActivateAccountView,\s*ResendActivationEmailView", "", urls_content)
urls_content = urls_content.replace(",\n    ActivateAccountView, ResendActivationEmailView", "")

with open('accounts/urls.py', 'w') as f:
    f.write(urls_content)

# Update accounts/views.py
with open('accounts/views.py', 'r') as f:
    views_content = f.read()

helper_func = """
def verify_email_otp(email, otp_code):
    from django.utils import timezone
    import datetime
    from rest_framework import status
    from accounts.models import EmailOTP
    
    now = timezone.now()
    locked_record = EmailOTP.objects.filter(email=email, locked_until__gt=now).first()
    if locked_record:
        return False, 'Too many failed attempts. Try again in 15 minutes.', status.HTTP_429_TOO_MANY_REQUESTS

    otp_record = EmailOTP.objects.filter(email=email, is_used=False).order_by("-created_at").first()
    if not otp_record or not otp_record.is_valid():
        return False, 'Invalid or expired clearance code.', status.HTTP_400_BAD_REQUEST

    if otp_record.otp != otp_code:
        otp_record.failed_attempts += 1
        if otp_record.failed_attempts >= 3:
            otp_record.locked_until = now + datetime.timedelta(minutes=15)
            otp_record.save()
            return False, 'Too many failed attempts. Try again in 15 minutes.', status.HTTP_429_TOO_MANY_REQUESTS
        otp_record.save()
        return False, 'Invalid or expired clearance code.', status.HTTP_400_BAD_REQUEST

    otp_record.is_used = True
    otp_record.save()
    return True, '', status.HTTP_200_OK

"""

views_content = views_content.replace('class CreateUserView', helper_func + '\nclass CreateUserView')

old_verify = """        from django.utils import timezone
        import datetime
        now = timezone.now()

        # 1. Reject immediately if locked
        locked_record = EmailOTP.objects.filter(email=email, locked_until__gt=now).first()
        if locked_record:
            return Response({'detail': 'Too many failed attempts. Try again in 15 minutes.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # 2. Get the most recent unused OTP for this email
        otp_record = EmailOTP.objects.filter(email=email, is_used=False).order_by("-created_at").first()

        if not otp_record or not otp_record.is_valid():
            return Response({'detail': 'Invalid or expired clearance code.'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Check the code
        if otp_record.otp != otp_code:
            otp_record.failed_attempts += 1
            if otp_record.failed_attempts >= 3:
                otp_record.locked_until = now + datetime.timedelta(minutes=15)
                otp_record.save()
                return Response({'detail': 'Too many failed attempts. Try again in 15 minutes.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            otp_record.save()
            return Response({'detail': 'Invalid or expired clearance code.'}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Success
        otp_record.is_used = True
        otp_record.save()

        return Response({'detail': 'Identity verified. Member cleared for creation.', 'verified': True})"""

new_verify = """        is_valid, msg, status_code = verify_email_otp(email, otp_code)
        if not is_valid:
            return Response({'detail': msg}, status=status_code)

        return Response({'detail': 'Identity verified. Member cleared for creation.', 'verified': True})"""
views_content = views_content.replace(old_verify, new_verify)

old_create_post = """        email = data.get('email', '').strip()
        password = data.get('password', '')
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        role = data.get('role', User.Role.EMPLOYEE)
        title = data.get('title', '').strip()
        phone = data.get('phone', '').strip()
        date_joined = data.get('date_joined')
        dob = data.get('date_of_birth')

        if not email or not password:
            return Response({'detail': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'detail': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Bypassing OTP check for admins. Setting up magic link activation flow."""

new_create_post = """        email = data.get('email', '').strip()
        password = data.get('password', '')
        otp_code = data.get('otp', '').strip()
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        role = data.get('role', User.Role.EMPLOYEE)
        title = data.get('title', '').strip()
        phone = data.get('phone', '').strip()
        date_joined = data.get('date_joined')
        dob = data.get('date_of_birth')

        if not email or not password or not otp_code:
            return Response({'detail': 'Email, password, and OTP code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'detail': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        is_valid, msg, status_code = verify_email_otp(email, otp_code)
        if not is_valid:
            return Response({'detail': msg}, status=status_code)"""
views_content = views_content.replace(old_create_post, new_create_post)

old_create_save = """        if date_joined:
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

new_create_save = """        if date_joined:
            user.date_joined = date_joined
        user.set_password(password)
        user.is_verified = True
        user._activity_user = request.user
        user.save()

        # Synchronous Welcome Email
        send_reliable_email_async(
            subject='Welcome to Colour Parrot - Account Created',
            message=(
                f'Hello {first_name},\\n\\n'
                'Your account on the Colour Parrot Task Management System has been created.\\n\\n'
                f'Username: {email}\\n'
                f'Password: {password}\\n\\n'
                'Please log in at: https://c1r9rt-workflow.in\\n\\n'
                'Best regards,\\n'
                'The Colour Parrot Team'
            ),
            recipient_list=[email]
        )"""
views_content = views_content.replace(old_create_save, new_create_save)

activate_views_pattern = r'class ActivateAccountView.*?class ResendActivationEmailView.*?return Response\(\{.*?\}\, status=status\.HTTP_200_OK\)'
views_content = re.sub(activate_views_pattern, '', views_content, flags=re.DOTALL)

with open('accounts/views.py', 'w') as f:
    f.write(views_content)
