#!/usr/bin/env python3
"""
Teste rápido do coletor
"""

import sys
import os

# Adicionar path
sys.path.insert(0, 'backend-v2/services/sne-collector')

def test_collector():
    try:
        print("🧪 Testando SNE Data Collector...")

        # Testar import
        from app import app
        print("✅ App importado com sucesso")

        # Testar endpoints
        with app.test_client() as client:
            # Health check
            response = client.get('/health')
            print(f"✅ Health check: {response.status_code}")

            # Debug binance (sem Redis necessário)
            response = client.get('/debug/binance')
            print(f"✅ Debug binance: {response.status_code}")
            if response.status_code == 200:
                data = response.get_json()
                print(f"   Egress OK: {data.get('egress_ok', 'Unknown')}")

        print("🎉 Coletor funcionando!")
        return True

    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        return False

if __name__ == '__main__':
    test_collector()
