"""
Teste de estrutura básica (sem dependências)
"""
import sys
import os

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_file_structure():
    """Testa se os arquivos principais existem"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    files_to_check = [
        'app/services/motor/motor_renan.py',
        'app/services/motor/contexto_global.py',
        'app/services/motor/estrutura_mercado.py',
        'app/services/motor/indicadores.py',
        'app/services/motor_service.py',
        'app/api/auth.py',
        'app/api/v1.py',
        'app/api/analyze.py',
        'app/integrations/cmc.py',
        'main.py',
        'requirements.txt'
    ]
    
    print("🧪 Verificando estrutura de arquivos...\n")
    
    all_exist = True
    for file_path in files_to_check:
        full_path = os.path.join(base_dir, file_path)
        if os.path.exists(full_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - NÃO ENCONTRADO")
            all_exist = False
    
    return all_exist

def test_import_structure():
    """Testa se a estrutura de imports está correta (sem executar)"""
    print("\n🧪 Verificando estrutura de imports...\n")
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    motor_dir = os.path.join(base_dir, 'app', 'services', 'motor')
    
    # Verificar se __init__.py existe
    init_file = os.path.join(motor_dir, '__init__.py')
    if os.path.exists(init_file):
        print("✅ app/services/motor/__init__.py existe")
    else:
        print("❌ app/services/motor/__init__.py não encontrado")
        return False
    
    # Verificar imports relativos no motor_renan.py
    motor_file = os.path.join(motor_dir, 'motor_renan.py')
    if os.path.exists(motor_file):
        with open(motor_file, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'from .contexto_global import' in content:
                print("✅ motor_renan.py usa imports relativos")
            else:
                print("⚠️ motor_renan.py pode não estar usando imports relativos")
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("TESTE DE ESTRUTURA - SNE RADAR")
    print("=" * 60)
    print()
    
    success1 = test_file_structure()
    success2 = test_import_structure()
    
    print()
    print("=" * 60)
    if success1 and success2:
        print("✅ Estrutura básica está correta!")
        print("⚠️ Para testes completos, instale dependências: pip install -r requirements.txt")
        sys.exit(0)
    else:
        print("❌ Alguns arquivos estão faltando")
        sys.exit(1)

