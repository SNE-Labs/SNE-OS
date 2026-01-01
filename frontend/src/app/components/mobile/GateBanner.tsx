import React from 'react';
import { cn } from '../../lib/utils';
import { SurfaceCard } from './SurfaceCard';
import { MobileButton } from './MobileButton';
import { Lock, Wallet, Shield, Zap } from 'lucide-react';

export type GateBannerType = 'free-limited' | 'connect-wallet' | 'sign-in' | 'upgrade-required';

export interface GateBannerProps {
  type: GateBannerType;
  title?: string;
  description?: string;
  ctaText?: string;
  onCtaClick?: () => void;
  className?: string;
}

const bannerConfig: Record<GateBannerType, {
  icon: React.ReactNode;
  defaultTitle: string;
  defaultDescription: string;
  defaultCta: string;
}> = {
  'free-limited': {
    icon: <Lock className="w-5 h-5" />,
    defaultTitle: 'Free Limited Access',
    defaultDescription: 'Connect your wallet to unlock full features',
    defaultCta: 'Connect Wallet',
  },
  'connect-wallet': {
    icon: <Wallet className="w-5 h-5" />,
    defaultTitle: 'Wallet Required',
    defaultDescription: 'Connect your wallet to continue',
    defaultCta: 'Connect Wallet',
  },
  'sign-in': {
    icon: <Shield className="w-5 h-5" />,
    defaultTitle: 'Sign In Required',
    defaultDescription: 'Sign in with Ethereum to access this feature',
    defaultCta: 'Sign In (SIWE)',
  },
  'upgrade-required': {
    icon: <Zap className="w-5 h-5" />,
    defaultTitle: 'Upgrade Required',
    defaultDescription: 'Upgrade to Pro to unlock this feature',
    defaultCta: 'Upgrade Now',
  },
};

export function GateBanner({
  type,
  title,
  description,
  ctaText,
  onCtaClick,
  className,
}: GateBannerProps) {
  const config = bannerConfig[type];

  return (
    <SurfaceCard 
      variant="warning" 
      padding="lg" 
      className={cn('flex flex-col gap-4', className)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 text-[var(--warning)]">
          {config.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-[var(--text-1)] mb-1">
            {title || config.defaultTitle}
          </h3>
          <p className="text-sm text-[var(--text-2)]">
            {description || config.defaultDescription}
          </p>
        </div>
      </div>
      
      <MobileButton 
        variant="primary" 
        onClick={onCtaClick}
        className="w-full"
      >
        {ctaText || config.defaultCta}
      </MobileButton>
    </SurfaceCard>
  );
}

