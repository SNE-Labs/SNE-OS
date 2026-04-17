# SNE Web Service

Flask API service with WebSocket support for SNE Radar dashboard.

## Local Development

### Prerequisites
- Python 3.10+
- PostgreSQL (or use docker-compose)

### Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export DATABASE_URL=postgresql://user:pass@localhost:5432/sne
export SECRET_KEY=your-secret-key
```

3. Run locally:
```bash
python -m app.main
```

Or with Gunicorn:
```bash
gunicorn --bind 0.0.0.0:8080 --workers 2 --worker-class gevent app.main:app
```

### Docker

Build:
```bash
docker build -t sne-web .
```

Run:
```bash
docker run -p 8080:8080 -e DATABASE_URL=postgresql://... sne-web
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: Flask secret key
- `PORT`: Server port (default: 8080)
- `INTEL_REFRESH_SECRET`: shared secret required by `POST /api/intel/refresh` for Railway cron/manual refresh
- `INTEL_INSTITUTIONAL_SECRET`: optional shared secret for institutional ingest/generate endpoints
- `INTEL_DISTRIBUTION_SECRET`: optional shared secret for controlled publish endpoints
- `INTEL_INSTITUTIONAL_PROVIDER`: institutional editorial provider (`heuristic` or OpenAI-backed)
- `INTEL_INSTITUTIONAL_MODEL`: model used for institutional post generation
- `INTEL_DISTRIBUTION_MODEL`: model used for channel-specific copy generation
- `INTEL_TELEGRAM_AUTO_PUBLISH`: enables automatic Telegram publish for newly generated Intel posts
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`: Telegram publish credentials
- `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_TO`: WhatsApp Cloud API publish credentials
- `X_CLIENT_ID` / `X_CLIENT_SECRET`: X OAuth app credentials
- `X_ACCESS_TOKEN` / `X_REFRESH_TOKEN`: X user-context tokens for `@SNELabs`
- `X_TOKEN_SCOPE`: expected X scopes such as `tweet.read tweet.write users.read offline.access`
- `X_PUBLISH_WEBHOOK_URL`: outbound webhook for X publishing orchestration
- `ETHEREUM_RPC_URLS`: comma-separated fallback RPC list for Ethereum
- `POLYGON_RPC_URLS`: comma-separated fallback RPC list for Polygon
- `SCROLL_RPC_URLS`: comma-separated fallback RPC list for Scroll

Example:
```bash
export ETHEREUM_RPC_URLS=https://ethereum-rpc.publicnode.com,https://rpc.ankr.com/eth,https://cloudflare-eth.com
export POLYGON_RPC_URLS=https://polygon-bor-rpc.publicnode.com,https://1rpc.io/matic,https://polygon-rpc.com
export SCROLL_RPC_URLS=https://rpc.scroll.io,https://scroll-mainnet.public.blastapi.io
```

## Endpoints

- `GET /health` - Health check
- `POST /api/analyze` - Analyze symbol/timeframe
- `GET /api/signal` - Get latest signal
- `POST /api/intel/institutional/ingest` - Ingest institutional fact pack
- `POST /api/intel/institutional/generate` - Generate institutional SNELabs post
- `GET /api/intel/institutional/posts` - List institutional posts
- `POST /api/intel/distribution/preview/<slug>` - Generate channel previews
- `POST /api/intel/distribution/publish/<slug>` - Publish to configured channels
- `POST /api/intel/distribution/autopublish` - Publish latest Intel posts to configured channels
- `GET /api/intel/distribution/x/account` - Validate the authenticated X account in the official API flow

## WebSocket Events

- `connect` - Client connects
- `disconnect` - Client disconnects
- `status` - Server status updates


