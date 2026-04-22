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
- `INTEL_TELEGRAM_AUTO_MIN_INTERVAL_SECONDS`: minimum spacing between automatic Telegram publishes
- `INTEL_TELEGRAM_AUTO_HOURLY_LIMIT`: maximum automatic Telegram publishes per UTC hour
- `INTEL_X_AUTO_PUBLISH`: enables automatic X publish for eligible Intel posts
- `INTEL_X_AUTO_MIN_INTERVAL_SECONDS`: minimum spacing between automatic X publishes
- `INTEL_X_AUTO_HOURLY_LIMIT`: maximum automatic X publishes per UTC hour
- `INTEL_X_NATIVE_FORMATS_ENABLED`: rotates X posts across native formats such as hook, question, checklist and short thread while keeping the link-summary format available
- `INTEL_DISTRIBUTION_DEDUPE_ENABLED`: enables repeated-topic suppression for automatic channel publishing
- `INTEL_DISTRIBUTION_DEDUPE_SECONDS`: lookback window for repeated-topic suppression
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`: Telegram publish credentials
- `RADAR_REPORT_SECRET`: optional secret for protected Radar report delivery endpoints; falls back to `INTEL_REFRESH_SECRET`
- `RADAR_REPORT_AUTO_PUBLISH`: enables automatic Radar report publishing to Telegram
- `RADAR_REPORT_AUTO_SYMBOLS`: comma-separated symbols for automatic Radar reports, defaults to `BTCUSDT,ETHUSDT,SOLUSDT`
- `RADAR_REPORT_AUTO_TIMEFRAMES`: comma-separated timeframes for automatic Radar reports, defaults to `1h,4h,1d`
- `RADAR_REPORT_AUTO_INCLUDE_CHART`: enables chart image delivery for automatic Radar reports
- `RADAR_REPORT_AUTO_CHECK_INTERVAL_SECONDS`: scheduler polling interval, defaults to `60`
- `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_TO`: WhatsApp Cloud API publish credentials
- `X_API_KEY` / `X_API_SECRET`: X OAuth 1.0a app credentials for direct posting as `@SNELabs`
- `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET`: X OAuth 1.0a user tokens for `@SNELabs`
- `X_CLIENT_ID` / `X_CLIENT_SECRET`: X OAuth 2.0 app credentials, optional fallback
- `X_REFRESH_TOKEN`: X OAuth 2.0 refresh token, optional fallback
- `X_TOKEN_SCOPE`: expected X scopes such as `tweet.read tweet.write users.read offline.access` for OAuth 2.0 fallback
- `X_PUBLISH_WEBHOOK_URL`: outbound webhook for X publishing orchestration
- `DEFAULT_NETWORK`: default sovereign access network, now expected to be `arbitrum`
- `SNE_KEYS_NETWORK`: explicit entitlement network override, typically `arbitrum`
- `ARBITRUM_SEPOLIA_RPC_URLS`: comma-separated fallback RPC list for Arbitrum Sepolia
- `ARBITRUM_RPC_URLS`: comma-separated fallback RPC list for Arbitrum
- `ETHEREUM_RPC_URLS`: comma-separated fallback RPC list for Ethereum
- `POLYGON_RPC_URLS`: comma-separated fallback RPC list for Polygon
- `SCROLL_RPC_URLS`: comma-separated fallback RPC list for Scroll
- `TRON_RPC_URL`: Tron RPC for checkout and payment verification flows

Example:
```bash
export DEFAULT_NETWORK=arbitrum
export SNE_KEYS_NETWORK=arbitrum
export ARBITRUM_SEPOLIA_RPC_URLS=https://sepolia-rollup.arbitrum.io/rpc,https://arbitrum-sepolia-rpc.publicnode.com
export ARBITRUM_RPC_URLS=https://arbitrum-one-rpc.publicnode.com,https://arb1.arbitrum.io/rpc
export ETHEREUM_RPC_URLS=https://ethereum-rpc.publicnode.com,https://rpc.ankr.com/eth,https://cloudflare-eth.com
export POLYGON_RPC_URLS=https://polygon-bor-rpc.publicnode.com,https://1rpc.io/matic,https://polygon-rpc.com
export SCROLL_RPC_URLS=https://rpc.scroll.io,https://scroll-mainnet.public.blastapi.io
export TRON_RPC_URL=https://api.trongrid.io
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


