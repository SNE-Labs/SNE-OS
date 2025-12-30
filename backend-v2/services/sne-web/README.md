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

## Endpoints

- `GET /health` - Health check
- `POST /api/analyze` - Analyze symbol/timeframe
- `GET /api/signal` - Get latest signal

## WebSocket Events

- `connect` - Client connects
- `disconnect` - Client disconnects
- `status` - Server status updates



