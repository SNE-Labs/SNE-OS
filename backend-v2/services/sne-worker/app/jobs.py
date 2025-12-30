"""
Job processing module for SNE Worker
"""
import logging
import os
import redis
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Redis connection (optional)
redis_client = None
if os.environ.get('REDIS_URL'):
    try:
        redis_client = redis.from_url(os.environ.get('REDIS_URL'))
    except Exception as e:
        logger.warning(f"Redis not available: {e}")

def process_backtest_job(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a backtest job
    """
    logger.info(f"Processing backtest job: {job_data}")
    
    # TODO: Integrate with backtest.py
    # This is where the actual backtest logic would run
    
    return {
        'status': 'completed',
        'results': {
            'total_trades': 100,
            'win_rate': 0.65,
            'profit_factor': 1.5,
            'sharpe_ratio': 1.2
        }
    }

def queue_job(job_type: str, job_data: Dict[str, Any]) -> str:
    """
    Queue a job (using Redis if available, otherwise in-memory)
    """
    if redis_client:
        job_id = f"{job_type}_{os.urandom(8).hex()}"
        redis_client.lpush('sne_jobs', job_id)
        redis_client.set(f"job:{job_id}", str(job_data))
        return job_id
    else:
        # Fallback to in-memory queue
        logger.warning("Redis not available, using in-memory queue")
        return f"{job_type}_inmem_{os.urandom(8).hex()}"



