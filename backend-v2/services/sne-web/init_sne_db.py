#!/usr/bin/env python3
"""
Initialize SNE database with default products and data
"""
import os
import sys
from datetime import datetime, timedelta

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def init_sne_products():
    """Initialize default SNE products"""
    from app import create_app
    from app.models import db, Product

    app = create_app()

    with app.app_context():
        try:
            # Create tables
            db.create_all()

            # Check if products already exist
            if Product.query.count() > 0:
                print("✅ Products already initialized")
                return

            # Default products
            products = [
                Product(
                    sku="sne_box",
                    name="SNE Box",
                    description="Hardware completo com ASIC PoU e Secure Element. Inclui todos os componentes necessários para operação autônoma da rede SNE.",
                    price_usd=999.00,
                    tier="premium",
                    category="hardware",
                    active=True
                ),
                Product(
                    sku="sne_key_pro",
                    name="SNE Key Pro",
                    description="Licença profissional para acesso completo ao SNE Radar. Inclui análise avançada, sinais em tempo real e indicadores proprietários.",
                    price_usd=199.00,
                    tier="pro",
                    category="license",
                    active=True
                ),
                Product(
                    sku="sne_license_basic",
                    name="SNE License Basic",
                    description="Licença básica para exploração do ecossistema SNE. Acesso a funcionalidades essenciais e comunidade.",
                    price_usd=49.00,
                    tier="basic",
                    category="license",
                    active=True
                ),
                Product(
                    sku="sne_key_enterprise",
                    name="SNE Key Enterprise",
                    description="Licença enterprise com recursos avançados, API dedicada e suporte prioritário. Inclui até 10 nós operacionais.",
                    price_usd=999.00,
                    tier="enterprise",
                    category="license",
                    active=True
                )
            ]

            # Add products
            for product in products:
                db.session.add(product)

            db.session.commit()
            print("✅ SNE products initialized successfully")
            print(f"   Added {len(products)} products")

        except Exception as e:
            print(f"❌ Error initializing products: {e}")
            db.session.rollback()
            return False

    return True

if __name__ == "__main__":
    print("🚀 Initializing SNE Database...")
    success = init_sne_products()
    if success:
        print("🎉 Database initialization completed!")
    else:
        print("💥 Database initialization failed!")
        sys.exit(1)


