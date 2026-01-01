import { MobilePageShell, SurfaceCard, ListItem, MobileButton, Badge } from '../../components/mobile';
import { CreditCard, Lock, RotateCcw, Wallet } from 'lucide-react';

export function MobilePass() {
  return (
    <MobilePageShell
      title="Pass"
      subtitle="Sistema de licenças SNE"
      showContext={true}
    >
      <SurfaceCard>
        <div className="text-center mb-4">
          <CreditCard className="w-12 h-12 text-[var(--accent-orange)] mx-auto mb-2" />
          <h3 className="text-[var(--text-1)] mb-1">Licenças On-chain</h3>
          <p className="text-sm text-[var(--text-2)]">
            Sistema de licenças baseado em NFTs na Scroll L2 para acesso aos serviços SNE.
          </p>
        </div>
      </SurfaceCard>

      <SurfaceCard padding="none">
        <div className="p-4 border-b border-[var(--stroke-1)]">
          <h3 className="text-[var(--text-1)]">Funcionalidades</h3>
        </div>
        <ListItem
          title="Licenças NFT"
          subtitle="ERC-721 na blockchain"
          icon={<CreditCard className="w-5 h-5" />}
        />
        <ListItem
          title="Revogação"
          subtitle="Controle total de acesso"
          icon={<Lock className="w-5 h-5" />}
        />
        <ListItem
          title="Rotation"
          subtitle="Chaves transitórias"
          icon={<RotateCcw className="w-5 h-5" />}
        />
      </SurfaceCard>

      <SurfaceCard>
        <div className="mb-4">
          <h3 className="text-[var(--text-1)] mb-1">Status da Conexão</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-2)]">Carteira conectada</span>
            <Badge variant="success">Conectado</Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-[var(--bg-2)] rounded-lg">
            <span className="text-sm text-[var(--text-2)]">Licenças ativas</span>
            <span className="text-[var(--text-1)] font-mono">3/5</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-[var(--bg-2)] rounded-lg">
            <span className="text-sm text-[var(--text-2)]">Próxima rotação</span>
            <span className="text-[var(--text-1)] font-mono">2d 14h</span>
          </div>
        </div>
      </SurfaceCard>

      <div className="space-y-3">
        <MobileButton variant="primary" className="w-full">
          <Wallet className="w-4 h-4 mr-2" />
          Gerenciar Licenças
        </MobileButton>

        <MobileButton variant="secondary" className="w-full">
          Ver na Blockchain
        </MobileButton>
      </div>
    </MobilePageShell>
  );
}

// Styles are handled by global CSS
