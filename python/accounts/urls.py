from django.urls import path

from accounts.views import LoginView, RefreshView, CreateUserView, ChangePasswordView

urlpatterns = [
    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('refresh/', RefreshView.as_view(), name='token_refresh'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('create-user/', CreateUserView.as_view(), name='create_user'),
]
