#!/usr/bin/env python3
"""
Script para inicializar o banco de dados SNE Radar
Cria as tabelas necessárias se não existirem
"""

import os
import sys
from pathlib import Path

# Adicionar diretório raiz ao path
ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))

# Carregar variáveis de ambiente
from dotenv import load_dotenv
load_dotenv()

def init_database():
    """Inicializa o banco de dados"""
    try:
        from app import app, db
        from app.models import init_db

        with app.app_context():
            print("🔄 Criando tabelas do banco de dados...")
            init_db()
            print("✅ Tabelas criadas com sucesso!")

            # Verificar se as tabelas foram criadas
            from app.models import User, Signal, Trade, Analysis, UserTier

            tables = [
                ('users', User),
                ('signals', Signal),
                ('trades', Trade),
                ('analyses', Analysis),
                ('user_tiers', UserTier)
            ]

            for table_name, model_class in tables:
                try:
                    # Verificar se tabela existe fazendo uma query simples
                    count = model_class.query.count()
                    print(f"✅ Tabela '{table_name}': OK ({count} registros)")
                except Exception as e:
                    print(f"⚠️  Tabela '{table_name}': Problema - {str(e)}")

    except Exception as e:
        print(f"❌ Erro ao inicializar banco: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    print("🚀 Inicializando banco de dados SNE Radar...")
    init_database()
    print("🎉 Inicialização concluída!")

