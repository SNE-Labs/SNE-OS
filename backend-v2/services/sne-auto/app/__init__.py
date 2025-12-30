"""
SNE Auto Service - Scheduled automation service
"""
from flask import Flask
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://localhost/sne')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

from . import main, scanner



