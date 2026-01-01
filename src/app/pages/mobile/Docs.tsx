import { MobilePageShell, SurfaceCard, ListItem, MobileButton } from '../../components/mobile';
import { BookOpen, Radar, Shield, CreditCard, Code, MessageCircle, ExternalLink } from 'lucide-react';

export function MobileDocs() {
  const sections = [
    {
      title: 'Introdução',
      content: 'O SNE OS é uma plataforma de análise de mercado que integra dados on-chain e off-chain para fornecer insights avançados sobre criptoativos.',
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      title: 'Principais Recursos',
      features: [
        { name: 'SNE Radar', desc: 'Análise de mercado em tempo real', icon: <Radar className="w-4 h-4" /> },
        { name: 'SNE Vault', desc: 'Segurança física para chaves privadas', icon: <Shield className="w-4 h-4" /> },
        { name: 'SNE Pass', desc: 'Sistema de licenças baseado em NFT', icon: <CreditCard className="w-4 h-4" /> }
      ]
    },
    {
      title: 'API',
      content: 'Acesse nossa API REST completa para integrar dados SNE em sua aplicação.',
      code: 'GET /api/v1/market/data',
      icon: <Code className="w-5 h-5" />
    },
    {
      title: 'Suporte',
      content: 'Entre em contato conosco para suporte técnico e dúvidas sobre a plataforma.',
      icon: <MessageCircle className="w-5 h-5" />
    }
  ];

  return (
    <MobilePageShell
      title="Documentação"
      subtitle="Guia completo do SNE OS"
      showContext={true}
    >
      {sections.map((section, index) => (
        <SurfaceCard key={index}>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              {section.icon}
              <h3 className="text-[var(--text-1)] text-lg font-semibold">{section.title}</h3>
            </div>
            <p className="text-sm text-[var(--text-2)]">{section.content}</p>
          </div>

          {section.features && (
            <div className="space-y-3">
              {section.features.map((feature, featureIndex) => (
                <ListItem
                  key={featureIndex}
                  title={feature.name}
                  subtitle={feature.desc}
                  icon={feature.icon}
                />
              ))}
            </div>
          )}

          {section.code && (
            <div className="bg-[var(--bg-1)] border border-[var(--stroke-1)] rounded-lg p-3 mt-3">
              <code className="text-sm text-[var(--text-1)] font-mono">{section.code}</code>
            </div>
          )}
        </SurfaceCard>
      ))}

      <div className="space-y-3">
        <MobileButton variant="primary" className="w-full">
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver Documentação Completa
        </MobileButton>

        <MobileButton variant="secondary" className="w-full">
          <MessageCircle className="w-4 h-4 mr-2" />
          Entrar em Contato
        </MobileButton>
      </div>
    </MobilePageShell>
  );
}
  .mobile-docs {
    padding: 16px;
    padding-bottom: 100px;
  }

  .mobile-docs-header {
    margin-bottom: 24px;
    text-align: center;
  }

  .mobile-docs-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-docs-subtitle {
    font-size: 16px;
    color: var(--text-3, #666);
    margin: 8px 0 0 0;
  }

  .mobile-docs-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .mobile-docs-section {
    background: var(--bg-2, #f5f5f5);
    border-radius: 12px;
    padding: 20px;
    border: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-docs-section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0 0 12px 0;
  }

  .mobile-docs-text {
    font-size: 14px;
    color: var(--text-2, #333);
    line-height: 1.5;
    margin: 0;
  }

  .mobile-docs-features {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .mobile-docs-feature {
    background: var(--bg-3, #fff);
    border-radius: 8px;
    padding: 16px;
    border: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-docs-feature h4 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0 0 8px 0;
  }

  .mobile-docs-feature p {
    font-size: 14px;
    color: var(--text-3, #666);
    margin: 0;
  }

  .mobile-docs-code {
    background: var(--bg-3, #fff);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--stroke-1, #e0e0e0);
    margin-top: 12px;
  }

  .mobile-docs-code code {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 12px;
    color: var(--text-1, #000);
  }
`;

// Styles are handled by global CSS
