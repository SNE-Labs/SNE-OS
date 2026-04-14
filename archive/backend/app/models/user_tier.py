"""
Model UserTier - Mapeamento off-chain de tiers (Premium/Pro)
"""
from datetime import datetime

# Este model será inicializado no main.py com db
# Por enquanto, definimos a estrutura básica

def get_user_tier_model(db):
    """Retorna o model UserTier inicializado com db"""
    
    class UserTier(db.Model):
        __tablename__ = 'user_tiers'
        
        id = db.Column(db.Integer, primary_key=True)
        address = db.Column(db.String(42), unique=True, nullable=False, index=True)
        tier = db.Column(db.String(20), nullable=False)  # free, premium, pro
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        synced_with_contract = db.Column(db.Boolean, default=False)
        
        def __repr__(self):
            return f'<UserTier {self.address}: {self.tier}>'
        
        def to_dict(self):
            return {
                'id': self.id,
                'address': self.address,
                'tier': self.tier,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None,
                'synced_with_contract': self.synced_with_contract
            }
    
    return UserTier
