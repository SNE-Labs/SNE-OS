"""
Telegram webhook handler
"""
from flask import request, jsonify
from . import app
import logging
import os
import requests
import html
from functools import wraps
import time

logger = logging.getLogger(__name__)

# Telegram configuration
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

# Idempotency tracking (in production, use Redis)
message_cache = {}
CACHE_TTL = 300  # 5 minutes

def sanitize_html(text: str) -> str:
    """Sanitize HTML to prevent injection"""
    return html.escape(text)

def is_duplicate(message_id: str) -> bool:
    """Check if message was already processed (idempotency)"""
    if message_id in message_cache:
        timestamp = message_cache[message_id]
        if time.time() - timestamp < CACHE_TTL:
            return True
    return False

def mark_processed(message_id: str):
    """Mark message as processed"""
    message_cache[message_id] = time.time()

def send_telegram_message(text: str, chat_id: str = None, retry_count: int = 3) -> bool:
    """
    Send message to Telegram with retry logic
    """
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not configured")
        return False
    
    chat_id = chat_id or TELEGRAM_CHAT_ID
    if not chat_id:
        logger.warning("TELEGRAM_CHAT_ID not configured")
        return False
    
    # Sanitize message
    safe_text = sanitize_html(text)
    
    url = f"{TELEGRAM_API_URL}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': safe_text,
        'parse_mode': 'HTML'
    }
    
    for attempt in range(retry_count):
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info(f"Message sent successfully to {chat_id}")
            return True
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < retry_count - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
    
    logger.error(f"Failed to send message after {retry_count} attempts")
    return False

@app.route('/webhook/telegram', methods=['POST'])
def telegram_webhook():
    """
    Handle Telegram webhook
    """
    try:
        data = request.get_json()
        
        # Extract message info
        message = data.get('message', {})
        message_id = str(message.get('message_id', ''))
        
        # Idempotency check
        if is_duplicate(message_id):
            logger.info(f"Duplicate message {message_id} ignored")
            return jsonify({'status': 'ok', 'message': 'duplicate'}), 200
        
        mark_processed(message_id)
        
        # Extract text
        text = message.get('text', '')
        chat_id = str(message.get('chat', {}).get('id', ''))
        
        logger.info(f"Received message from {chat_id}: {text[:50]}")
        
        # Process command (stub)
        if text.startswith('/'):
            command = text.split()[0]
            response_text = f"Command received: {command}\n(Handler not implemented yet)"
        else:
            response_text = f"Message received: {text[:100]}"
        
        # Send response
        send_telegram_message(response_text, chat_id)
        
        return jsonify({'status': 'ok'}), 200
        
    except Exception as e:
        logger.error(f"Error in telegram_webhook: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/webhook/telegram/send', methods=['POST'])
def send_message():
    """
    Send message via Telegram (internal API)
    Expected payload: { "text": "message", "chat_id": "123" }
    """
    try:
        data = request.get_json() or {}
        text = data.get('text', '')
        chat_id = data.get('chat_id', TELEGRAM_CHAT_ID)
        
        if not text:
            return jsonify({'error': 'text is required'}), 400
        
        success = send_telegram_message(text, chat_id)
        
        return jsonify({
            'status': 'ok' if success else 'error',
            'sent': success
        }), 200 if success else 500
        
    except Exception as e:
        logger.error(f"Error in send_message: {str(e)}")
        return jsonify({'error': str(e)}), 500



