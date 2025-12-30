#!/usr/bin/env python3
"""
SNE Data Collector - Teste de egress simplificado
"""

import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/health')
def health():
    """Health check"""
    return jsonify({"ok": True, "service": "sne-collector"})

@app.route('/debug/binance')
def debug_binance():
    """Testa egress para Binance"""
    try:
        r = requests.get("https://api.binance.com/api/v3/time", timeout=5)
        body = r.json()
        return jsonify({
            "ok": True,
            "status": r.status_code,
            "body": body,
            "egress_ok": r.status_code == 200
        })
    except Exception as e:
        return jsonify({
            "ok": False,
            "err": str(e),
            "egress_ok": False
        }), 502

@app.route('/debug/binance')
def debug_binance():
    """Endpoint de debug para testar egress da Binance"""
    try:
        # Teste básico na Binance
        response = requests.get(
            "https://api.binance.com/api/v3/time",
            timeout=BINANCE_TIMEOUT
        )

        return jsonify({
            "status_code": response.status_code,
            "response": response.json() if response.status_code == 200 else response.text,
            "timestamp": datetime.utcnow().isoformat(),
            "egress_ok": response.status_code == 200
        })

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "egress_ok": False
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    print(f"🚀 SNE Data Collector starting on port {port}")
    app.run(host="0.0.0.0", port=port)
