"""
WSGI entry point for Gunicorn
"""
try:
    import eventlet
    eventlet.monkey_patch()
except ImportError:
    # Local/dev environments may run without eventlet using threading mode.
    eventlet = None

from app import create_app

app = create_app()

# Gunicorn will use the 'app' object

if __name__ == "__main__":
    app.run()
