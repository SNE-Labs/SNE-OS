# SNE Auto Service

Scheduled automation service triggered by Cloud Scheduler for continuous market scanning.

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
```

3. Run locally:
```bash
python -m app.main
```

### Testing the scan endpoint

```bash
curl -X POST http://localhost:8080/run-scan \
  -H "Content-Type: application/json" \
  -d '{"pairs": ["BTCUSDT"], "timeframes": ["15m"]}'
```

### Docker

Build:
```bash
docker build -t sne-auto .
```

Run:
```bash
docker run -p 8080:8080 -e DATABASE_URL=postgresql://... sne-auto
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 8080)

## Endpoints

- `GET /health` - Health check
- `POST /run-scan` - Run automated scan (idempotent)

## Cloud Scheduler Integration

This service is designed to be called by Cloud Scheduler:
- Every 1 minute: Quick scan
- Every 5 minutes: Full scan
- Every 1 hour: Hourly report
- Every 24 hours: Daily report

## Idempotency

All operations are idempotent - safe to call multiple times.



