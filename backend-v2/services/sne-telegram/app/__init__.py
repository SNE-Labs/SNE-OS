"""
SNE Telegram Service - Telegram webhook handler
"""
from flask import Flask
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

from . import main, webhook



