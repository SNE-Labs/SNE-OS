"""
Teste de imports do motor de análise
"""
import sys
import os

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_motor_imports():
    """Testa se todos os imports do motor funcionam"""
    try:
        from app.services.motor.motor_renan import analise_completa
        print("[OK] Import de motor_renan.analise_completa")
        
        from app.services.motor.contexto_global import analisar_contexto
        print("[OK] Import de contexto_global")
        
        from app.services.motor.estrutura_mercado import analisar_estrutura
        print("[OK] Import de estrutura_mercado")
        
        from app.services.motor.indicadores import calcular_indicadores
        print("[OK] Import de indicadores")
        
        from app.services.motor.indicadores_avancados import calcular_indicadores_avancados
        print("[OK] Import de indicadores_avancados")
        
        from app.services.motor.multi_timeframe import analise_multitf
        print("[OK] Import de multi_timeframe")
        
        from app.services.motor.confluencia import calcular_confluencia
        print("[OK] Import de confluencia")
        
        from app.services.motor.fluxo_ativo import FluxoAtivo
        print("[OK] Import de fluxo_ativo")
        
        from app.services.motor.padroes_graficos import detectar_padroes
        print("[OK] Import de padroes_graficos")
        
        from app.services.motor.analise_candles_detalhada import analisar_candle_atual
        print("[OK] Import de analise_candles_detalhada")
        
        from app.services.motor.gestao_risco_profissional import GestaoRiscoProfissional
        print("[OK] Import de gestao_risco_profissional")
        
        from app.services.motor.niveis_operacionais import NiveisOperacionais
        print("[OK] Import de niveis_operacionais")
        
        print("\n[OK] Todos os imports do motor funcionam corretamente!")
        return True
        
    except ImportError as e:
        print(f"[ERRO] Erro de import: {e}")
        return False
    except Exception as e:
        print(f"[ERRO] Erro inesperado: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Testando imports do motor de analise...\n")
    success = test_motor_imports()
    sys.exit(0 if success else 1)

