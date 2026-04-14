"""
Teste do Flask app (verifica se pode ser inicializado)
"""
import sys
import os

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_flask_app_import():
    """Testa se o Flask app pode ser importado"""
    try:
        from main import app
        print("[OK] Flask app pode ser importado")
        return True
    except Exception as e:
        print(f"[ERRO] Erro ao importar Flask app: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_flask_app_config():
    """Testa se o Flask app tem configuração básica"""
    try:
        from main import app
        
        # Verificar configurações básicas
        assert app.config.get('SECRET_KEY'), "SECRET_KEY deve estar configurado"
        print("[OK] SECRET_KEY configurado")
        
        assert app.config.get('SQLALCHEMY_DATABASE_URI'), "DATABASE_URL deve estar configurado"
        print("[OK] DATABASE_URL configurado")
        
        return True
    except Exception as e:
        print(f"[ERRO] Erro na configuração: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_flask_app_blueprints():
    """Testa se todos os blueprints estão registrados"""
    try:
        from main import app
        
        # Listar blueprints registrados
        blueprints = list(app.blueprints.keys())
        print(f"[OK] Blueprints registrados: {', '.join(blueprints)}")
        
        expected_blueprints = ['auth', 'v1', 'analyze', 'dashboard', 'charts', 'analysis']
        for bp in expected_blueprints:
            if bp in blueprints:
                print(f"[OK] Blueprint '{bp}' registrado")
            else:
                print(f"[AVISO] Blueprint '{bp}' não encontrado")
        
        return True
    except Exception as e:
        print(f"[ERRO] Erro ao verificar blueprints: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("TESTE DO FLASK APP")
    print("=" * 60)
    print()
    
    results = []
    
    print("1. Testando import do Flask app...")
    results.append(test_flask_app_import())
    print()
    
    if results[0]:
        print("2. Testando configuração do Flask app...")
        results.append(test_flask_app_config())
        print()
        
        print("3. Testando blueprints registrados...")
        results.append(test_flask_app_blueprints())
        print()
    
    print("=" * 60)
    if all(results):
        print("[OK] Flask app está pronto para rodar!")
        print()
        print("Para iniciar o servidor:")
        print("  python main.py")
        print()
        print("Ou com gunicorn (produção):")
        print("  gunicorn --bind 0.0.0.0:5000 main:app")
        sys.exit(0)
    else:
        print("[ERRO] Alguns testes falharam")
        sys.exit(1)

