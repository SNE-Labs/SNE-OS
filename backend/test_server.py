"""
Script simples para testar se o servidor está rodando
"""
import requests
import sys

def test_server(port=5000):
    """Testa se o servidor está respondendo"""
    try:
        url = f"http://localhost:{port}/health"
        response = requests.get(url, timeout=2)
        
        if response.status_code == 200:
            print(f"[OK] Servidor rodando na porta {port}")
            print(f"Resposta: {response.text[:100]}")
            return True
        else:
            print(f"[AVISO] Servidor respondeu com status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"[INFO] Servidor não está rodando na porta {port}")
        return False
    except Exception as e:
        print(f"[ERRO] Erro ao testar servidor: {e}")
        return False

if __name__ == "__main__":
    print("Testando servidor Flask...")
    print()
    
    # Testar porta 5000 (padrão Flask)
    if test_server(5000):
        sys.exit(0)
    
    # Testar porta 8080 (Cloud Run padrão)
    if test_server(8080):
        sys.exit(0)
    
    print()
    print("Servidor não está rodando.")
    print("Para iniciar:")
    print("  python main.py")
    sys.exit(1)

