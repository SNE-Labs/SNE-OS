#!/usr/bin/env python3
"""
Script simples para criar tabelas via Python
Execute com: railway run python create_tables.py
"""

import os
import sys

# Adicionar diretório atual ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def create_tables():
    """Cria as tabelas usando SQLAlchemy"""

    # Importar apenas o necessário
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import SQLAlchemyError

    # Pegar DATABASE_URL do ambiente
    database_url = os.environ.get('DATABASE_URL')

    if not database_url:
        print("❌ DATABASE_URL não encontrada!")
        sys.exit(1)

    print(f"🔄 Conectando ao banco: {database_url[:50]}...")

    try:
        # Criar engine
        engine = create_engine(database_url)

        # SQL para criar tabelas
        sql_commands = [
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS signals (
                id SERIAL PRIMARY KEY,
                pair VARCHAR(20) NOT NULL,
                signal_type VARCHAR(50) NOT NULL,
                price DECIMAL(18, 8),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS trades (
                id SERIAL PRIMARY KEY,
                pair VARCHAR(20) NOT NULL,
                side VARCHAR(10) NOT NULL,
                price DECIMAL(18, 8) NOT NULL,
                quantity DECIMAL(18, 8) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id SERIAL PRIMARY KEY,
                user_address VARCHAR(42) NOT NULL,
                pair VARCHAR(20) NOT NULL,
                timeframe VARCHAR(10) NOT NULL,
                analysis_result JSONB NOT NULL,
                tier VARCHAR(20) DEFAULT 'free',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS user_tiers (
                id SERIAL PRIMARY KEY,
                user_address VARCHAR(42) UNIQUE NOT NULL,
                tier VARCHAR(20) DEFAULT 'free',
                license_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """,
            # Índices
            "CREATE INDEX IF NOT EXISTS idx_signals_pair ON signals(pair);",
            "CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp);",
            "CREATE INDEX IF NOT EXISTS idx_trades_pair ON trades(pair);",
            "CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);",
            "CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_address);",
            "CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at);",
            "CREATE INDEX IF NOT EXISTS idx_user_tiers_address ON user_tiers(user_address);"
        ]

        with engine.connect() as conn:
            print("🚀 Criando tabelas...")

            for i, sql in enumerate(sql_commands, 1):
                try:
                    conn.execute(text(sql))
                    print(f"✅ Comando {i}/{len(sql_commands)} executado")
                except SQLAlchemyError as e:
                    print(f"⚠️  Comando {i} falhou: {str(e)}")
                    continue

            conn.commit()
            print("🎉 Todas as tabelas criadas com sucesso!")

    except Exception as e:
        print(f"❌ Erro ao conectar/criar tabelas: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    print("🚀 Criando tabelas do SNE Radar...")
    create_tables()
    print("✅ Script concluído!")
