"""
Teste de integração simples (sem executar análise completa)
Testa apenas se os componentes podem ser importados e inicializados
"""
import sys
import os

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_motor_service_wrapper():
    """Testa se motor_service pode ser importado e tem as funções corretas"""
    try:
        from app.services.motor_service import analyze, extract_signal, make_json_serializable
        
        # Verificar se as funções existem
        assert callable(analyze), "analyze deve ser uma função"
        assert callable(extract_signal), "extract_signal deve ser uma função"
        assert callable(make_json_serializable), "make_json_serializable deve ser uma função"
        
        print("✅ motor_service: Todas as funções disponíveis")
        return True
    except Exception as e:
        print(f"❌ Erro ao testar motor_service: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_cmc_integration():
    """Testa se integração CMC pode ser importada"""
    try:
        from app.integrations.cmc import get_global_metrics
        
        # Verificar se função existe
        assert callable(get_global_metrics), "get_global_metrics deve ser uma função"
        
        print("✅ CMC integration: Função disponível")
        return True
    except Exception as e:
        print(f"❌ Erro ao testar CMC integration: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_blueprints():
    """Testa se todos os blueprints podem ser importados"""
    blueprints = [
        ('app.api.auth', 'auth_bp'),
        ('app.api.v1', 'v1_bp'),
        ('app.api.analyze', 'analyze_bp'),
        ('app.api.dashboard', 'dashboard_bp'),
        ('app.api.charts', 'charts_bp'),
        ('app.api.analysis', 'analysis_bp'),
    ]
    
    all_ok = True
    for module_name, blueprint_name in blueprints:
        try:
            module = __import__(module_name, fromlist=[blueprint_name])
            blueprint = getattr(module, blueprint_name)
            print(f"✅ {blueprint_name}: OK")
        except Exception as e:
            print(f"❌ {blueprint_name}: {e}")
            all_ok = False
    
    return all_ok

if __name__ == "__main__":
    print("=" * 60)
    print("TESTE DE INTEGRAÇÃO SIMPLES")
    print("=" * 60)
    print()
    
    results = []
    
    print("1. Testando motor_service...")
    results.append(test_motor_service_wrapper())
    print()
    
    print("2. Testando CMC integration...")
    results.append(test_cmc_integration())
    print()
    
    print("3. Testando API blueprints...")
    results.append(test_api_blueprints())
    print()
    
    print("=" * 60)
    if all(results):
        print("✅ Todos os testes de integração passaram!")
        print("\n⚠️ Nota: Para testes completos com análise real,")
        print("   instale dependências: pip install -r requirements.txt")
        sys.exit(0)
    else:
        print("❌ Alguns testes falharam")
        sys.exit(1)

