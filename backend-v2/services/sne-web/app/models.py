"""
Modelos SQLAlchemy para SNE Radar
Baseado no schema existente do PostgreSQL
"""

from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import JSONB

from .extensions import db

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

class Product(db.Model):
    """Tabela de produtos SNE disponíveis"""
    __tablename__ = 'products'

    sku = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    price_usd = db.Column(db.Numeric(10, 2), nullable=False)
    tier = db.Column(db.String(20), default='basic')  # free, basic, pro, premium
    category = db.Column(db.String(50), default='license')  # license, hardware, service
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class License(db.Model):
    """Tabela de licenças adquiridas pelos usuários"""
    __tablename__ = 'licenses'

    id = db.Column(db.String(100), primary_key=True)  # transaction hash ou ID único
    user_address = db.Column(db.String(42), nullable=False, index=True)
    sku = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # pro_annual, basic_monthly, etc.
    status = db.Column(db.String(20), default='active')  # active, expired, revoked
    purchased_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    transaction_hash = db.Column(db.String(66))  # Ethereum tx hash
    payment_method = db.Column(db.String(20))  # stripe, crypto, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Checkout(db.Model):
    """Tabela de checkouts/intents de pagamento"""
    __tablename__ = 'checkouts'

    id = db.Column(db.String(100), primary_key=True)  # checkout ID único
    user_address = db.Column(db.String(42), nullable=False, index=True)
    sku = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(20))  # stripe, crypto
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed
    stripe_session_id = db.Column(db.String(100))  # Para Stripe
    crypto_address = db.Column(db.String(42))  # Para crypto payments
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class WatchlistItem(db.Model):
    """Tabela de itens da watchlist (addresses/symbols)"""
    __tablename__ = 'watchlist_items'

    id = db.Column(db.Integer, primary_key=True)
    user_address = db.Column(db.String(42), nullable=False, index=True)
    list_type = db.Column(db.String(20), nullable=False)  # passport, radar
    target_address = db.Column(db.String(42))  # Para passport watchlist
    symbol = db.Column(db.String(20))  # Para radar watchlist
    label = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Analysis(db.Model):
    """Tabela para armazenar análises realizadas"""
    __tablename__ = 'analyses'

    id = db.Column(db.String(100), primary_key=True)
    user_address = db.Column(db.String(42), nullable=False)  # Wallet address
    pair = db.Column(db.String(20), nullable=False)
    timeframe = db.Column(db.String(10), nullable=False)
    analysis_result = db.Column(JSONB, nullable=False)
    tier = db.Column(db.String(20), default='free')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PassportIdentity(db.Model):
    """Identidade raiz do Passport dentro do OS."""
    __tablename__ = 'passport_identities'

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"pid_{uuid.uuid4().hex}")
    anchor_address = db.Column(db.String(42), nullable=False, unique=True, index=True)
    primary_wallet_id = db.Column(db.Integer, db.ForeignKey('passport_identity_wallets.id'))
    status = db.Column(db.String(20), default='active', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PassportIdentityWallet(db.Model):
    """Carteiras vinculadas a uma identidade Passport."""
    __tablename__ = 'passport_identity_wallets'

    id = db.Column(db.Integer, primary_key=True)
    identity_id = db.Column(db.String(64), db.ForeignKey('passport_identities.id'), nullable=False, index=True)
    address = db.Column(db.String(42), nullable=False, unique=True, index=True)
    chain_family = db.Column(db.String(20), default='evm', nullable=False)
    wallet_type = db.Column(db.String(20), default='wallet', nullable=False)
    label = db.Column(db.String(120))
    status = db.Column(db.String(20), default='active', nullable=False)
    is_primary = db.Column(db.Boolean, default=False, nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PassportIdentityEvent(db.Model):
    """Trilha de auditoria da identidade Passport."""
    __tablename__ = 'passport_identity_events'

    id = db.Column(db.Integer, primary_key=True)
    identity_id = db.Column(db.String(64), db.ForeignKey('passport_identities.id'), nullable=False, index=True)
    event_type = db.Column(db.String(50), nullable=False)
    actor_address = db.Column(db.String(42))
    target_address = db.Column(db.String(42))
    event_payload = db.Column("payload", JSONB, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)


class PassportIdentityLinkRequest(db.Model):
    """Fluxo pendente para vincular uma nova carteira ao Passport."""
    __tablename__ = 'passport_identity_link_requests'

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"plink_{uuid.uuid4().hex}")
    identity_id = db.Column(db.String(64), db.ForeignKey('passport_identities.id'), nullable=False, index=True)
    requested_by_address = db.Column(db.String(42), nullable=False, index=True)
    candidate_address = db.Column(db.String(42), nullable=False, index=True)
    nonce = db.Column(db.String(64), nullable=False, unique=True, index=True)
    status = db.Column(db.String(20), default='pending', nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class PassportIdentityProfile(db.Model):
    """Perfil customizavel ancorado no checkpoint de identidade Passport."""
    __tablename__ = 'passport_identity_profiles'

    identity_id = db.Column(db.String(64), db.ForeignKey('passport_identities.id'), primary_key=True)
    display_name = db.Column(db.String(80))
    handle = db.Column(db.String(32), unique=True, index=True)
    bio = db.Column(db.Text)
    location = db.Column(db.String(80))
    website_url = db.Column(db.String(255))
    avatar_url = db.Column(db.String(512))
    banner_url = db.Column(db.String(512))
    accent_color = db.Column(db.String(7))
    social_links = db.Column(JSONB, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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

        existing_tables = set(inspector.get_table_names())
        required_tables = set(db.metadata.tables.keys())
        missing_tables = sorted(required_tables - existing_tables)

        print(f"📊 Existing tables: {sorted(existing_tables)}")
        if missing_tables:
            print(f"🧩 Missing tables detected: {missing_tables}")
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
