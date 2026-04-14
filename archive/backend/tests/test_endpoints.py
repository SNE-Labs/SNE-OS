"""
Teste básico dos endpoints (sem Flask app)
"""
import sys
import os

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_api_imports():
    """Testa se os blueprints podem ser importados"""
    try:
        from app.api.auth import auth_bp
        print("✅ Import de auth_bp: OK")
        
        from app.api.v1 import v1_bp
        print("✅ Import de v1_bp: OK")
        
        from app.api.analyze import analyze_bp
        print("✅ Import de analyze_bp: OK")
        
        from app.api.dashboard import dashboard_bp
        print("✅ Import de dashboard_bp: OK")
        
        from app.api.charts import charts_bp
        print("✅ Import de charts_bp: OK")
        
        from app.api.analysis import analysis_bp
        print("✅ Import de analysis_bp: OK")
        
        print("\n✅ Todos os blueprints podem ser importados!")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao importar blueprints: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_integrations():
    """Testa se as integrações podem ser importadas"""
    try:
        from app.integrations.cmc import get_global_metrics
        print("✅ Import de cmc.get_global_metrics: OK")
        
        print("\n✅ Todas as integrações podem ser importadas!")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao importar integrações: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 Testando endpoints e integrações...\n")
    
    success1 = test_api_imports()
    success2 = test_integrations()
    
    if success1 and success2:
        print("\n✅ Todos os testes de endpoints passaram!")
        sys.exit(0)
    else:
        print("\n❌ Alguns testes falharam")
        sys.exit(1)

