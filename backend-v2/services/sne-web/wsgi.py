"""
WSGI entry point for Gunicorn
"""
import eventlet
eventlet.monkey_patch()

from app import create_app

app = create_app()

# Gunicorn will use the 'app' object

if __name__ == "__main__":
    app.run()
