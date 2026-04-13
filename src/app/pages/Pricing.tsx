import { Check, X, ShoppingCart, CreditCard } from 'lucide-react';
import { useState } from 'react';

export function Pricing() {
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const handleChoosePlan = (tier: any) => {
    setSelectedPlan(tier);
    setShowCheckout(true);
  };

  const tiers = [
    {
      name: 'Free',
      price: 'R$0',
      period: 'para sempre',
      description: 'Explore o ecossistema SNE sem custo.',
      features: [
        { name: 'Dados de mercado em tempo real', included: true },
        { name: 'Interface web responsiva', included: true },
        { name: 'Métricas básicas', included: true },
        { name: 'Suporte via documentação', included: true },
        { name: 'Funcionalidades de trading', included: false },
        { name: 'Suporte prioritário', included: false },
        { name: 'Analytics avançados', included: false },
        { name: 'Integração SNE Vault', included: false },
      ],
      cta: 'Começar agora',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'por mês',
      description: 'Acesso completo a todas as funcionalidades do SNE OS.',
      features: [
        { name: 'Acesso completo de leitura e escrita', included: true },
        { name: 'Funcionalidades de trading', included: true },
        { name: 'Analytics avançados', included: true },
        { name: 'Suporte prioritário', included: true },
        { name: 'Integrações customizadas', included: true },
        { name: 'Acesso completo à API', included: true },
        { name: 'Alertas em tempo real', included: true },
        { name: 'Integração SNE Vault', included: true },
      ],
      cta: 'Assinar Pro',
      highlighted: false,
    },
    {
      name: 'Enterprise',
      price: 'Personalizado',
      period: 'entre em contato',
      description: 'Infraestrutura sob medida para organizações.',
      features: [
        { name: 'Tudo do plano Pro', included: true },
        { name: 'Nós dedicados', included: true },
        { name: 'SLAs customizados', included: true },
        { name: 'Opções white-label', included: true },
        { name: 'Deploy on-premise', included: true },
        { name: 'Suporte dedicado', included: true },
        { name: 'Descontos por volume', included: true },
        { name: 'Integração enterprise SNE Vault', included: true },
      ],
      cta: 'Falar com equipe',
      highlighted: false,
    },
  ];

  return (
    <div className="flex-1 px-8 py-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Planos</p>
          <h1 className="text-4xl font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Acesso ao SNE OS</h1>
          <p className="text-lg" style={{ color: 'var(--text-2)' }}>
            Escolha o nível de acesso que melhor se encaixa na sua operação.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-xl p-6"
              style={{
                backgroundColor: 'var(--bg-2)',
                borderWidth: '1px',
                borderColor: 'var(--stroke-1)',
              }}
            >

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-1)' }}>{tier.name}</h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold" style={{ color: 'var(--text-1)' }}>{tier.price}</span>
                  <span className="text-sm" style={{ color: 'var(--text-3)' }}>/{tier.period}</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>{tier.description}</p>
              </div>

              <button
                onClick={() => handleChoosePlan(tier)}
                className="w-full px-4 py-3 rounded-lg text-sm font-medium mb-6 transition-colors"
                style={{
                  backgroundColor: 'var(--bg-3)',
                  color: 'var(--text-1)',
                  borderWidth: '1px',
                  borderColor: 'var(--stroke-1)',
                }}
              >
                {tier.cta}
              </button>

              <div className="space-y-3">
                {tier.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check size={16} style={{ color: 'var(--ok-green)', marginTop: '2px' }} />
                    ) : (
                      <X size={16} style={{ color: 'var(--text-3)', marginTop: '2px' }} />
                    )}
                    <span
                      className="text-sm"
                      style={{ color: feature.included ? 'var(--text-2)' : 'var(--text-3)' }}
                    >
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Technical Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Performance Metrics */}
          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Especificações Técnicas</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Disponibilidade</span>
                <span style={{ color: 'var(--text-1)' }}>99,9% uptime</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Latência</span>
                <span style={{ color: 'var(--text-1)' }}>&lt;100ms</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Limite da API</span>
                <span style={{ color: 'var(--text-1)' }}>1000 req/min</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-3)' }}>Período de teste</span>
                <span style={{ color: 'var(--text-1)' }}>30 dias gratuitos</span>
              </div>
            </div>
          </div>

          {/* Integration Info */}
          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Integração SNE Vault</h3>
            <div className="space-y-3 text-sm">
              <p style={{ color: 'var(--text-3)' }}>
                O plano Pro desbloqueia integração direta com dispositivos SNE Vault e verificação de licenças on-chain.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check size={14} style={{ color: 'var(--ok-green)' }} />
                  <span style={{ color: 'var(--text-2)' }}>Verificação Proof of Uptime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} style={{ color: 'var(--ok-green)' }} />
                  <span style={{ color: 'var(--text-2)' }}>Arquitetura zero-knowledge</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} style={{ color: 'var(--ok-green)' }} />
                  <span style={{ color: 'var(--text-2)' }}>Autenticação SIWE</span>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                Documentação completa em /docs/vault-integration
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Perguntas Frequentes</h3>
          <div className="space-y-4">
            {[
              {
                q: 'Qual a diferença entre o plano Free e o Pro?',
                a: 'O Free dá acesso somente leitura aos dados de mercado e à interface web. O Pro desbloqueia trading completo, analytics avançados, acesso à API e suporte prioritário.'
              },
              {
                q: 'Como funciona a integração com o SNE Vault?',
                a: 'O plano Pro habilita integração direta com dispositivos SNE Vault via APIs padronizadas, incluindo verificação de licenças on-chain e Proof of Uptime.'
              },
              {
                q: 'Posso mudar de plano a qualquer momento?',
                a: 'Sim. As alterações têm efeito imediato e não há período mínimo de compromisso.'
              },
              {
                q: 'Quais métodos de pagamento são aceitos?',
                a: 'Aceitamos os principais cartões de crédito e pagamentos em criptomoedas.'
              },
            ].map((faq, index) => (
              <div key={index}>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-1)' }}>{faq.q}</p>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowCheckout(false)}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-md mx-4 rounded-lg"
            style={{ backgroundColor: 'var(--bg-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--stroke-1)' }}>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>Confirmar plano</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 rounded-lg hover:bg-[var(--bg-2)] transition-colors"
              >
                <X size={20} style={{ color: 'var(--text-2)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Plan Details */}
              <div className="mb-6">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium" style={{ color: 'var(--text-1)' }}>Plano {selectedPlan.name}</span>
                    <span className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{selectedPlan.price}</span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-2)' }}>{selectedPlan.description}</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{selectedPlan.period}</p>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className="font-medium mb-3" style={{ color: 'var(--text-1)' }}>O que está incluso</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedPlan.features.filter(f => f.included).map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check size={14} style={{ color: 'var(--ok-green)', marginTop: '2px' }} />
                      <span className="text-sm" style={{ color: 'var(--text-2)' }}>{feature.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="rounded-lg px-4 py-3 mb-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                  Integração de pagamento em breve. Seu plano selecionado foi registrado.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--bg-2)]"
                  style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                  style={{ backgroundColor: 'var(--accent-orange)', color: '#FFFFFF' }}
                >
                  Entendido
                </button>
              </div>

              <p className="text-xs text-center mt-4" style={{ color: 'var(--text-3)' }}>
                Ao continuar, você concorda com nossos Termos de Serviço.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
