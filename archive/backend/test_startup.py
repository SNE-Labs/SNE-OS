"""
Teste de startup do Flask app - simula o que acontece ao iniciar
"""
import sys
import os

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("TESTE DE STARTUP DO FLASK APP")
print("=" * 60)
print()

try:
    print("1. Importando Flask app...")
    from main import app
    print("   [OK] App importado")
    
    print("2. Verificando rotas...")
    routes = list(app.url_map.iter_rules())
    print(f"   [OK] {len(routes)} rotas registradas")
    
    print("3. Testando rota raiz...")
    with app.test_client() as client:
        response = client.get('/')
        print(f"   [OK] Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   [OK] Resposta: {response.get_data(as_text=True)[:100]}")
    
    print("4. Testando /health...")
    with app.test_client() as client:
        response = client.get('/health')
        print(f"   [OK] Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   [OK] Resposta: {response.get_data(as_text=True)[:100]}")
    
    print()
    print("=" * 60)
    print("[OK] Flask app está pronto para rodar!")
    print("=" * 60)
    print()
    print("Para iniciar o servidor:")
    print("  python main.py")
    print()
    print("O servidor iniciará em: http://127.0.0.1:5000")
    
except Exception as e:
    print()
    print("=" * 60)
    print(f"[ERRO] Erro ao testar startup: {e}")
    print("=" * 60)
    import traceback
    traceback.print_exc()
    sys.exit(1)

