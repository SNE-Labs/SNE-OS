import { useNavigate } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { Button } from '../app/components/Button'
import { cn } from '../lib/utils'

type Tier = 'free' | 'premium' | 'pro'

export default function Pricing() {
  const navigate = useNavigate()
  const { tier: currentTier } = useWallet()

  const tiers = [
    {
      name: 'Free',
      price: 'R$ 0',
      period: '/mês',
      tier: 'free' as Tier,
      badge: 'GRÁTIS',
      badgeColor: 'bg-[#1B1B1F] text-[#A6A6A6]',
      features: [
        { text: 'Dashboard básico (Top 5)', available: true },
        { text: '3 análises/dia', available: true },
        { text: '1 símbolo no chart', available: true },
        { text: 'Timeframes limitados', available: true },
        { text: 'Sem backtest', available: false },
        { text: 'Sem alertas', available: false },
      ],
    },
    {
      name: 'Premium',
      price: 'R$ 199',
      period: '/mês',
      tier: 'premium' as Tier,
      badge: 'POPULAR',
      badgeColor: 'bg-[rgba(255,106,0,0.2)] text-[#FF6A00]',
      features: [
        { text: 'Dashboard completo', available: true },
        { text: '50 análises/dia', available: true },
        { text: 'Multi-timeframe', available: true },
        { text: 'Alertas ilimitados', available: true },
        { text: 'Backtest básico', available: true },
        { text: 'Histórico 30 dias', available: true },
      ],
      popular: true,
    },
    {
      name: 'Pro',
      price: 'R$ 799',
      period: '/mês',
      tier: 'pro' as Tier,
      badge: 'PROFISSIONAL',
      badgeColor: 'bg-[rgba(255,200,87,0.2)] text-[#FFC857]',
      features: [
        { text: 'Tudo do Premium', available: true },
        { text: '1000 análises/dia', available: true },
        { text: 'DOM completo', available: true },
        { text: 'Backtest avançado', available: true },
        { text: 'Webhooks', available: true },
        { text: 'Histórico ilimitado', available: true },
        { text: 'SLA 99.9%', available: true },
      ],
    },
  ]

  const handleSubscribe = (tier: Tier) => {
    // TODO: Integrar com gateway de pagamento
    console.log('Subscribe to:', tier)
    navigate('/dashboard')
  }

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4">Escolha seu plano</h2>
        <p className="text-[#A6A6A6] text-lg">Análise técnica avançada para traders profissionais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tierData) => (
          <div
            key={tierData.tier}
            className={cn(
              'bg-gradient-to-br from-[#111216] to-[#1B1B1F] border rounded-[10px] p-8 relative transition-all duration-150',
              tierData.popular
                ? 'border-[#FF6A00] shadow-[0_8px_24px_rgba(255,106,0,0.15)]'
                : 'border-[rgba(255,255,255,0.1)] hover:border-[#FF6A00]'
            )}
          >
            <div className={cn('inline-block px-3 py-1 rounded-full text-xs font-medium mb-6', tierData.badgeColor)}>
              {tierData.badge}
            </div>

            <div className="mb-6">
              <div className="text-4xl font-bold mb-2">
                {tierData.price}
                <span className="text-lg text-[#A6A6A6] font-normal">{tierData.period}</span>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {tierData.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  {feature.available ? (
                    <span className="text-[#00C48C] mt-0.5">✓</span>
                  ) : (
                    <span className="text-[#FF4D4F] mt-0.5">✗</span>
                  )}
                  <span className={cn('text-sm', !feature.available && 'text-[#A6A6A6]')}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>

            <Button
              variant={currentTier === tierData.tier ? 'secondary' : tierData.popular ? 'primary' : 'secondary'}
              className="w-full"
              onClick={() => handleSubscribe(tierData.tier)}
            >
              {currentTier === tierData.tier ? 'Plano Atual' : `Assinar ${tierData.name}`}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

