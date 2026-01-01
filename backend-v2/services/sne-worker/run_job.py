#!/usr/bin/env python3
"""
CLI entry point for running jobs locally
Usage: python -m sne_worker.run_job <job_type> <job_data_json>
"""
import sys
import json
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.jobs import process_backtest_job

def main():
    if len(sys.argv) < 3:
        print("Usage: python -m sne_worker.run_job <job_type> <job_data_json>")
        sys.exit(1)
    
    job_type = sys.argv[1]
    job_data = json.loads(sys.argv[2])
    
    if job_type == 'backtest':
        result = process_backtest_job(job_data)
        print(json.dumps(result, indent=2))
    else:
        print(f"Unknown job type: {job_type}")
        sys.exit(1)

if __name__ == '__main__':
    main()



