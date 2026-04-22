web: daphne -b 0.0.0.0 -p $PORT colour_parrot.asgi:application
worker: celery -A colour_parrot worker -l info
