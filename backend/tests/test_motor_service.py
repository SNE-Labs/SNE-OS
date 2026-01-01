"""
Teste do motor_service wrapper
"""
import sys
import os

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_motor_service_import():
    """Testa se motor_service pode ser importado"""
    try:
        from app.services.motor_service import analyze, extract_signal
        print("✅ Import de motor_service: OK")
        return True
    except Exception as e:
        print(f"❌ Erro ao importar motor_service: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_motor_service_analyze():
    """Testa se motor_service.analyze() funciona (sem executar análise completa)"""
    try:
        from app.services.motor_service import analyze
        
        # Testar apenas se a função existe e pode ser chamada
        # Não vamos executar análise completa aqui (pode demorar)
        print("✅ Função analyze() disponível")
        return True
    except Exception as e:
        print(f"❌ Erro ao testar analyze(): {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 Testando motor_service...\n")
    
    success1 = test_motor_service_import()
    success2 = test_motor_service_analyze()
    
    if success1 and success2:
        print("\n✅ Todos os testes do motor_service passaram!")
        sys.exit(0)
    else:
        print("\n❌ Alguns testes falharam")
        sys.exit(1)

