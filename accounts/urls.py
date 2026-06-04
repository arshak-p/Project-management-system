from django.urls import path

from accounts.views import (
    LoginView, RefreshView, CreateUserView, 
    SendOTPView, VerifyOTPActionView
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('refresh/', RefreshView.as_view(), name='token_refresh'),
    path('create-user/', CreateUserView.as_view(), name='create_user'),
    path('send-creation-otp/', SendOTPView.as_view(), name='send_creation_otp'),
    path('verify-creation-otp/', VerifyOTPActionView.as_view(), name='verify_creation_otp'),
]
