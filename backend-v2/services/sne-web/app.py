#!/usr/bin/env python3
"""
SNE Web Service - Versão Railway baseada no commit funcional cb0380c
"""
import os
from app import app, socketio

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    print(f"🚀 Starting SNE Web Service on port {port}")

    # Usar SocketIO.run() como no commit funcional
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
