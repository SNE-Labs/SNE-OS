import { MobilePageShell, SurfaceCard, MobileButton, Badge } from '../../components/mobile';
import { Star, Zap, Building2, Check } from 'lucide-react';

export function MobilePricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      icon: <Zap className="w-6 h-6" />,
      features: ['Dados básicos', 'Interface web', 'Suporte documentação'],
      variant: 'default' as const,
      buttonText: 'Começar',
      popular: false
    },
    {
      name: 'Pro',
      price: '$29/mês',
      icon: <Star className="w-6 h-6" />,
      features: ['API completa', 'Analytics avançados', 'Integração SNE Vault', 'Suporte prioritário'],
      variant: 'elevated' as const,
      buttonText: 'Selecionar Pro',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      icon: <Building2 className="w-6 h-6" />,
      features: ['Soluções personalizadas', 'Nós dedicados', 'SLAs customizados', 'Suporte dedicado'],
      variant: 'default' as const,
      buttonText: 'Contato',
      popular: false
    }
  ];

  return (
    <MobilePageShell
      title="Planos"
      subtitle="Acesso ao SNE OS"
      showContext={true}
    >
      {plans.map((plan, index) => (
        <SurfaceCard
          key={plan.name}
          variant={plan.variant}
          className="relative"
        >
          {plan.popular && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <Badge variant="pro">Mais Popular</Badge>
            </div>
          )}

          <div className="text-center mb-4">
            <div className="text-[var(--accent-orange)] mb-2">{plan.icon}</div>
            <h3 className="text-[var(--text-1)] text-lg font-semibold">{plan.name}</h3>
            <div className="text-2xl font-bold text-[var(--accent-orange)] font-mono mt-2">
              {plan.price}
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {plan.features.map((feature, featureIndex) => (
              <div key={featureIndex} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[var(--success)] flex-shrink-0" />
                <span className="text-sm text-[var(--text-2)]">{feature}</span>
              </div>
            ))}
          </div>

          <MobileButton
            variant={plan.popular ? "primary" : "secondary"}
            className="w-full"
          >
            {plan.buttonText}
          </MobileButton>
        </SurfaceCard>
      ))}

      <SurfaceCard variant="elevated">
        <div className="text-center">
          <h3 className="text-[var(--text-1)] mb-2">Perguntas Frequentes</h3>
          <p className="text-sm text-[var(--text-2)] mb-4">
            Dúvidas sobre nossos planos? Entre em contato conosco.
          </p>
          <MobileButton variant="ghost" className="w-full">
            Fale Conosco
          </MobileButton>
        </div>
      </SurfaceCard>
    </MobilePageShell>
  );
}
