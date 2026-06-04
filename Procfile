web: python manage.py migrate && python create_admin.py && python seed_workflow.py && daphne -b 0.0.0.0 -p $PORT colour_parrot.asgi:application
worker: celery -A colour_parrot worker -B -l info
