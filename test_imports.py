#!/usr/bin/env python3
"""
Teste para verificar se os imports funcionam corretamente
"""

import sys
sys.path.insert(0, 'backend-v2/services/sne-web')

def test_imports():
    """Testa imports críticos"""
    try:
        # Testar charts_api
        from app.charts_api import charts_bp
        print("✅ charts_api importado com sucesso")

        # Testar dashboard_api
        from app.dashboard_api import dashboard_bp
        print("✅ dashboard_api importado com sucesso")

        # Testar json usage
        import json as json_lib
        test_data = {"test": "ok"}
        json_str = json_lib.dumps(test_data)
        print(f"✅ json_lib.dumps funciona: {json_str}")

        # Testar redis
        from app.utils.redis_safe import SafeRedis
        redis_client = SafeRedis()
        print("✅ Redis Safe importado")

        return True

    except Exception as e:
        print(f"❌ Erro no import: {str(e)}")
        return False

if __name__ == '__main__':
    print("🧪 Testando imports...")
    success = test_imports()
    if success:
        print("🎉 Todos os imports funcionam!")
    else:
        print("❌ Problemas nos imports")
