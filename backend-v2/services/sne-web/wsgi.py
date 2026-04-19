"""WSGI entry point for Gunicorn."""

from app import app

# Gunicorn will use the 'app' object

if __name__ == "__main__":
    app.run()
