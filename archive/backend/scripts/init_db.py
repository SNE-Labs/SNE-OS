"""
Script para inicializar o banco de dados
"""
import os
import sys
from pathlib import Path

# Adicionar diretório raiz ao path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app, db, UserTier

def init_db():
    """Criar todas as tabelas"""
    with app.app_context():
        db.create_all()
        print("✅ Tabelas criadas com sucesso!")
        
        # Verificar se a tabela user_tiers foi criada
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        if 'user_tiers' in tables:
            print("✅ Tabela 'user_tiers' encontrada!")
        else:
            print("⚠️ Tabela 'user_tiers' não encontrada!")

if __name__ == '__main__':
    init_db()

