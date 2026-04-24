import { useMemo } from 'react';

type LivingSystemLayerProps = {
  pathname: string;
};

const surfaceSeeds = {
  home: ['USDT', 'INTEL', 'SYNC', 'VAULT', 'RADAR', 'PASS'],
  radar: ['LIQ', 'VOL', 'RISK', 'FLOW', 'ETH', 'BTC'],
  intel: ['BRIEF', 'CHAIN', 'ASSET', 'DOSSIER', 'SOURCE', 'READ'],
  vault: ['USDT', 'GAS', 'BAL', 'READY', 'ROUTE', 'EXEC'],
  pass: ['PID', 'SIWE', 'WALLET', 'ANCHOR', 'LINK', 'SESSION'],
  keys: ['OWNER', 'KEY', 'DELEGATE', 'TIER', 'ACCESS', 'SALE'],
  docs: ['REF', 'SPEC', 'GUIDE', 'API', 'OPS', 'STACK'],
} as const;

type SurfaceKey = keyof typeof surfaceSeeds;

function resolveSurface(pathname: string): SurfaceKey {
  if (pathname.startsWith('/radar')) return 'radar';
  if (pathname.startsWith('/intel') || pathname.startsWith('/blog')) return 'intel';
  if (pathname.startsWith('/vault') || pathname.startsWith('/swaps')) return 'vault';
  if (pathname.startsWith('/pass')) return 'pass';
  if (pathname.startsWith('/keys') || pathname.startsWith('/secrets')) return 'keys';
  if (pathname.startsWith('/docs')) return 'docs';
  return 'home';
}

export function LivingSystemLayer({ pathname }: LivingSystemLayerProps) {
  const surface = resolveSurface(pathname);
  const nodes = useMemo(() => {
    const seeds = surfaceSeeds[surface];
    return Array.from({ length: 14 }, (_, index) => {
      const lane = index % 7;
      const orbit = Math.floor(index / 7);
      return {
        label: seeds[index % seeds.length],
        left: 7 + lane * 14 + (orbit ? 5 : 0),
        top: orbit ? 68 - lane * 5 : 18 + lane * 6,
        delay: index * 0.38,
        duration: 8 + (index % 5) * 1.4,
      };
    });
  }, [surface]);

  return (
    <div className={`living-system living-system--${surface}`} aria-hidden="true">
      <div className="living-system__mesh" />
      <div className="living-system__radar living-system__radar--a" />
      <div className="living-system__radar living-system__radar--b" />
      <div className="living-system__spine" />
      <div className="living-system__nodes">
        {nodes.map((node, index) => (
          <span
            key={`${surface}-${node.label}-${index}`}
            className="living-system__node"
            style={{
              left: `${node.left}%`,
              top: `${node.top}%`,
              animationDelay: `${node.delay}s`,
              animationDuration: `${node.duration}s`,
            }}
          >
            {node.label}
          </span>
        ))}
      </div>
    </div>
  );
}
