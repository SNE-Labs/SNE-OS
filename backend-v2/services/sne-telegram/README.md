# SNE Telegram Service

Telegram webhook handler for SNE Radar notifications and commands.

## Local Development

### Prerequisites
- Python 3.10+

### Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export TELEGRAM_BOT_TOKEN=your-bot-token
export TELEGRAM_CHAT_ID=your-chat-id
export SECRET_KEY=your-secret-key
```

3. Run locally:
```bash
python -m app.main
```

### Setting up Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/webhook/telegram"
```

### Docker

Build:
```bash
docker build -t sne-telegram .
```

Run:
```bash
docker run -p 8080:8080 \
  -e TELEGRAM_BOT_TOKEN=... \
  -e TELEGRAM_CHAT_ID=... \
  sne-telegram
```

## Environment Variables

- `TELEGRAM_BOT_TOKEN`: Telegram bot token (from Secret Manager)
- `TELEGRAM_CHAT_ID`: Default chat ID for notifications
- `SECRET_KEY`: Flask secret key
- `PORT`: Server port (default: 8080)

## Endpoints

- `GET /health` - Health check
- `POST /webhook/telegram` - Telegram webhook handler
- `POST /webhook/telegram/send` - Send message via Telegram (internal API)

## Features

- HTML sanitization
- Retry logic (3 attempts with exponential backoff)
- Idempotency (duplicate message detection)
- Message caching (5 minute TTL)



