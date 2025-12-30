# SNE Worker Service

Background job processor for CPU-intensive tasks like backtesting.

## Local Development

### Prerequisites
- Python 3.10+
- PostgreSQL (or use docker-compose)
- Redis (optional, for job queue)

### Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export DATABASE_URL=postgresql://user:pass@localhost:5432/sne
export REDIS_URL=redis://localhost:6379/0  # Optional
```

3. Run locally:
```bash
python -m app.main
```

### Running Jobs Locally

```bash
python -m sne_worker.run_job backtest '{"symbol":"BTCUSDT","timeframe":"1h"}'
```

### Docker

Build:
```bash
docker build -t sne-worker .
```

Run:
```bash
docker run -p 8080:8080 -e DATABASE_URL=postgresql://... sne-worker
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string (optional)
- `PORT`: Server port (default: 8080)

## Endpoints

- `GET /health` - Health check
- `POST /run-backtest` - Queue/run backtest job

## Resource Configuration

Default memory: 1Gi (CPU-intensive workloads)



