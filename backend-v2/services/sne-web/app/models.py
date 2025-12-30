"""
Modelos SQLAlchemy para SNE Radar
Baseado no schema existente do PostgreSQL
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB

db = SQLAlchemy()

class User(db.Model):
    """Tabela de usuários (se existir)"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

class Signal(db.Model):
    """Tabela de sinais de trading"""
    __tablename__ = 'signals'

    id = db.Column(db.Integer, primary_key=True)
    pair = db.Column(db.String(20), nullable=False)
    signal_type = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Numeric(18, 8))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    signal_metadata = db.Column("metadata", JSONB)  # Dados extras em JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Trade(db.Model):
    """Tabela de trades executados"""
    __tablename__ = 'trades'

    id = db.Column(db.Integer, primary_key=True)
    pair = db.Column(db.String(20), nullable=False)
    side = db.Column(db.String(10), nullable=False)  # BUY/SELL
    price = db.Column(db.Numeric(18, 8), nullable=False)
    quantity = db.Column(db.Numeric(18, 8), nullable=False)
    status = db.Column(db.String(20), default='pending')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    trade_metadata = db.Column("metadata", JSONB)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Analysis(db.Model):
    """Tabela para armazenar análises realizadas"""
    __tablename__ = 'analyses'

    id = db.Column(db.Integer, primary_key=True)
    user_address = db.Column(db.String(42), nullable=False)  # Wallet address
    pair = db.Column(db.String(20), nullable=False)
    timeframe = db.Column(db.String(10), nullable=False)
    analysis_result = db.Column(JSONB, nullable=False)
    tier = db.Column(db.String(20), default='free')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserTier(db.Model):
    """Tabela para armazenar tiers dos usuários"""
    __tablename__ = 'user_tiers'

    id = db.Column(db.Integer, primary_key=True)
    user_address = db.Column(db.String(42), unique=True, nullable=False)
    tier = db.Column(db.String(20), default='free')
    license_expires = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def is_active(self):
        """Verifica se a license está ativa"""
        if not self.license_expires:
            return True  # Licença vitalícia ou free
        return datetime.utcnow() < self.license_expires

# Funções auxiliares
def init_db():
    """Inicializa o banco de dados"""
    try:
        with db.session.begin():
            # Criar todas as tabelas
            db.create_all()
        print("✅ Database tables created successfully")
        return True
    except Exception as e:
        print(f"❌ Error creating database tables: {str(e)}")
        return False

def init_db_auto():
    """Inicialização automática do banco na startup"""
    try:
        # Verificar se já existem tabelas
        from sqlalchemy import inspect
        inspector = inspect(db.engine)

        existing_tables = inspector.get_table_names()
        print(f"📊 Existing tables: {existing_tables}")

        if not existing_tables or len(existing_tables) < 5:
            print("🚀 Creating database tables automatically...")
            success = init_db()
            if success:
                print("🎉 Database initialized successfully!")
            else:
                print("❌ Failed to initialize database")
        else:
            print("✅ Database already initialized")

    except Exception as e:
        print(f"⚠️ Could not check database status: {str(e)}")
        # Tentar criar tabelas mesmo assim
        init_db()

def get_user_tier(user_address: str) -> str:
    """Obtém tier do usuário do banco"""
    user_tier = UserTier.query.filter_by(user_address=user_address.lower()).first()
    if user_tier and user_tier.is_active():
        return user_tier.tier
    return 'free'

def set_user_tier(user_address: str, tier: str, license_expires=None):
    """Define tier do usuário"""
    user_tier = UserTier.query.filter_by(user_address=user_address.lower()).first()

    if user_tier:
        user_tier.tier = tier
        user_tier.license_expires = license_expires
        user_tier.updated_at = datetime.utcnow()
    else:
        user_tier = UserTier(
            user_address=user_address.lower(),
            tier=tier,
            license_expires=license_expires
        )
        db.session.add(user_tier)

    db.session.commit()
    return user_tier

def save_analysis(user_address: str, pair: str, timeframe: str, result: dict, tier: str):
    """Salva análise realizada"""
    analysis = Analysis(
        user_address=user_address.lower(),
        pair=pair,
        timeframe=timeframe,
        analysis_result=result,
        tier=tier
    )
    db.session.add(analysis)
    db.session.commit()
    return analysis

def get_user_analyses_count(user_address: str, since=None) -> int:
    """Conta análises realizadas pelo usuário"""
    query = Analysis.query.filter_by(user_address=user_address.lower())

    if since:
        query = query.filter(Analysis.created_at >= since)

    return query.count()

def save_signal(pair: str, signal_type: str, price: float = None, metadata: dict = None):
    """Salva sinal de trading"""
    signal = Signal(
        pair=pair,
        signal_type=signal_type,
        price=price,
        signal_metadata=metadata or {}
    )
    db.session.add(signal)
    db.session.commit()
    return signal
