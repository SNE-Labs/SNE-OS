"""
Teste seguro de imports - identifica problemas antes de iniciar o servidor
"""
import sys
import os

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testando imports do Flask app...")
print()

try:
    print("1. Importando Flask...")
    from flask import Flask
    print("   [OK] Flask")
    
    print("2. Importando dependências básicas...")
    import redis
    print("   [OK] redis")
    
    import pandas as pd
    print("   [OK] pandas")
    
    import numpy as np
    print("   [OK] numpy")
    
    print("3. Importando módulos do app...")
    from app.models.user_tier import get_user_tier_model
    print("   [OK] user_tier")
    
    from app.services.license_service import LicenseService
    print("   [OK] license_service")
    
    print("4. Testando conexão Redis (pode falhar se Redis não estiver rodando)...")
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0, socket_connect_timeout=1)
        r.ping()
        print("   [OK] Redis conectado")
    except Exception as e:
        print(f"   [AVISO] Redis não está rodando: {e}")
        print("   [INFO] Isso é normal em desenvolvimento - o app funcionará com fallback")
    
    print("5. Importando main app...")
    from main import app
    print("   [OK] Flask app importado")
    
    print()
    print("=" * 60)
    print("[OK] Todos os imports funcionam!")
    print("=" * 60)
    print()
    print("O app está pronto para rodar.")
    print("Se Redis não estiver rodando, alguns recursos podem não funcionar,")
    print("mas o app deve iniciar normalmente.")
    
except Exception as e:
    print()
    print("=" * 60)
    print(f"[ERRO] Erro ao importar: {e}")
    print("=" * 60)
    import traceback
    traceback.print_exc()
    sys.exit(1)

