#!/usr/bin/env python3
"""
Endpoint temporário para inicializar banco
Execute: python init_endpoint.py
"""

import requests
import time

# URL do seu serviço Railway
SERVICE_URL = "https://api.snelabs.space"

def init_database():
    """Chama endpoint para inicializar banco"""

    print("🚀 Inicializando banco de dados...")

    try:
        # Tentar health check primeiro
        response = requests.get(f"{SERVICE_URL}/health", timeout=10)
        if response.status_code != 200:
            print(f"❌ Serviço não está respondendo: {response.status_code}")
            return

        print("✅ Serviço está rodando")

        # Criar endpoint temporário no app para init
        # Por enquanto, vamos tentar um approach diferente

        print("🔄 Tentando conectar ao banco via endpoint...")

        # Fazer uma requisição que force a criação das tabelas
        test_response = requests.post(
            f"{SERVICE_URL}/api/auth/nonce",
            json={"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"},
            timeout=15
        )

        if test_response.status_code == 200:
            print("✅ Banco parece estar funcionando!")
            print("🔍 Verifique no painel Railway se as tabelas foram criadas")
        else:
            print(f"❌ Erro na API: {test_response.status_code}")
            print(test_response.text)

    except requests.exceptions.RequestException as e:
        print(f"❌ Erro de conexão: {str(e)}")
    except Exception as e:
        print(f"❌ Erro inesperado: {str(e)}")

if __name__ == '__main__':
    init_database()
