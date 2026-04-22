"""JWT token payload enriched with Colour Parrot role metadata."""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = getattr(user, "role", "")
        token["name"] = user.get_full_name() or user.email
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data["user"] = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "department_id": getattr(getattr(user, "tms_profile", None), "department_id", None),
            "client_project_id": getattr(
                getattr(user, "tms_profile", None), "client_project_id", None
            ),
        }
        return data
