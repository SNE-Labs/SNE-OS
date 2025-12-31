import { useEffect, useRef, useState } from "react";
import {
  Book,
  Code,
  Shield,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { CodeBlock } from "../components/sne/CodeBlock";
import { StatusBadge } from "../components/sne/StatusBadge";
import { Input } from "../components/ui/input";

type SectionItem = { id: string; label: string };
type Section = {
  title: string;
  icon: any;
  items: SectionItem[];
};

/**
 * Docs page — completa, com suporte a navegação via hash (#radar, #vault, etc.)
 * - Inicializa selectedDoc a partir de window.location.hash
 * - Escuta "hashchange" e "popstate" para sincronia com histórico / Products.openDoc
 * - Sincroniza URL quando o usuário seleciona um documento no sidebar
 * - Rola o conteúdo para o topo quando o doc muda (smooth)
 *
 * Coloque este arquivo em app/pages/Docs.tsx (ou equivalente).
 */
export function Docs() {
  const mainRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // conteúdo (mantive a totalidade do seu conteúdo original)
  const sections: Section[] = [
    {
      title: "Começando",
      icon: Book,
      items: [
        { id: "overview", label: "Visão Geral" },
        { id: "quickstart", label: "Quick Start" },
        { id: "architecture", label: "Arquitetura" },
      ],
    },
    {
      title: "Produtos",
      icon: Shield,
      items: [
        { id: "radar", label: "SNE Radar" },
        { id: "vault", label: "SNE Vault" },
        { id: "keys", label: "SNE Keys" },
      ],
    },
    {
      title: "API Reference",
      icon: Code,
      items: [
        { id: "sdk", label: "SDK" },
        { id: "contracts", label: "Contratos" },
        { id: "rest", label: "REST API" },
      ],
    },
    {
      title: "Segurança & Hardware",
      icon: Shield,
      items: [
        { id: "exec-env", label: "Ambiente de Execução" },
        { id: "nte", label: "NTE (Motor de Inferência)" },
        { id: "pou", label: "Proof of Uptime (PoU)" },
        { id: "sne-pass", label: "SNE Pass (Custódia)" },
        { id: "sne-box", label: "SNE Box (Hardware)" },
        { id: "hardware", label: "Especificações" },
        { id: "governance", label: "Governança & SNIPs" },
        { id: "appendix", label: "Appendix" },
      ],
    },
  ];

  const content: Record<string, any> = {
    overview: {
      title: "Visão Geral do Sistema SNE",
      tldr: "SNE fornece prova criptográfica de uptime, proteção de propriedade intelectual via execução em memória volátil e segregação entre leitura de mercado e custódia. Registro e verificação ocorrem on-chain na Scroll L2.",
      sections: [
        {
          heading: "Motivação",
          content:
            "Operadores de infraestrutura crítica precisam comprovar uptime e integridade sem confiar em terceiros. SNE resolve isso com provas verificáveis on-chain, zeroization física e um root-of-trust híbrido (controller + ASIC).",
        },
        {
          heading: "Componentes Principais",
          content:
            "SNE Radar (ingestão e processamento do tensor Vt), SNE Vault (cofre físico e armazenamento cifrado), SNE Pass (Secure Element / orquestrador de custódia) e BitAxe (ASIC PoU).",
        },
      ],
    },

    quickstart: {
      title: "Quick Start",
      tldr: "Inicie um nó SNE e realize o handshake de licença na Scroll L2.",
      sections: [
        {
          heading: "Pré-requisitos",
          content:
            "Wallet Ethereum com saldo na Scroll L2, NFT de licença SNE, node.js >= 18 ou Rust >= 1.70, conexão P2P ou satélite opcional.",
        },
        {
          heading: "Registro e Ativação (resumo)",
          content:
            "Registrar a licença on-chain, executar o desafio local, assinar com a chave do operador, validar checkAccess no contrato SNELicenseRegistry e, após validação, descriptografar pesos θ em RAM via AES-256.",
        },
      ],
    },

    architecture: {
      title: "Arquitetura de Rede e Topologia",
      tldr: "Topologia mesh de Edge Nodes que consomem dados diretamente e submetem raízes Merkle / heartbeats à Scroll L2 para prova de existência física.",
      sections: [
        {
          heading: "Topologia",
          content:
            "Nós operam em malha (mesh). Cada nó processa localmente, submetendo provas agregadas (Merkle roots) e heartbeats à Scroll L2. Isso reduz dependência de servidores centrais e melhora resistência a Sybil.",
        },
      ],
    },

    radar: {
      title: "SNE Radar — Ingestão e Processamento de Mercado",
      tldr: "SNE Radar é o componente de inteligência responsável por coletar, normalizar e transformar dados brutos de mercado no tensor Vt, operando em modo read-only e isolado do caminho de custódia.",
      sections: [
        {
          heading: "Função",
          content:
            "Ingestão direta (WebSockets / Satélite / P2P), pré-processamento de ticks, cálculo de features (Osciladores, Tendência, Volume, Bandas, Padrões, DOM) e exposição de Scores para o NTE. Não possui capacidade de assinar ou movimentar ativos.",
        },
        {
          heading: "Interface",
          content:
            "Exporte Scores e metadados via socket local ou IPC para o controlador. Os dados sensíveis nunca transitam pelo SNE Pass; comunicação é unidirecional quando possível.",
        },
        {
          heading: "Deployment",
          content:
            "Projetado para rodar em ARM ou x86 com aceleração vetorial opcional (AVX-512). Use mlock para buffers críticos e aplique mitigação de canais laterais.",
        },
      ],
    },

    vault: {
      title:
        "SNE Vault — Cofre Físico e Armazenamento Criptográfico",
      tldr: "SNE Vault é o componente de custódia física: armazenamento cifrado de blobs (pesos θ, backups), integração com Secure Element e políticas de zeroization em caso de tentativa de intrusão física.",
      sections: [
        {
          heading: "Armazenamento",
          content:
            "Blobs cifrados (AES-256) armazenados em storage fisicamente protegido. As chaves mestres ficam no Secure Element (TPM/TEE) e só liberam chaves de sessão após handshake on-chain.",
        },
        {
          heading: "Zeroization e Tamper-Resistance",
          content:
            "A malha de sensores no chassi (Tamper-Detection Line) dispara a purga instantânea de memória volátil e corte de alimentação ao SE, tornando o dispositivo inerte.",
        },
        {
          heading: "Recuperação e Reprovisionamento",
          content:
            "A SNE Physical Key autentica operações de reprovisionamento; processos de recuperação exigem verificação física e validação on-chain para regenerar Kroot e chaves voláteis.",
        },
      ],
    },

    keys: {
      title: "SNE Keys — Licenciamento e Gestão de Identidade",
      tldr: "SNE Keys provê gestão on-chain de licenças (NFT ERC-721), autenticação de operadores e o mecanismo de autorização para ativação do NTE e SNE Pass.",
      sections: [
        {
          heading: "Licença",
          content:
            "Licenças são NFTs on-chain registradas no SNELicenseRegistry. checkAccess(nodeID) valida se o operador tem direito de ativar o nó.",
        },
        {
          heading: "Assinatura e Handshake",
          content:
            "O operador assina um desafio local; a assinatura + verificação on-chain liberam a descriptografia dos blobs em RAM via AES-256.",
        },
        {
          heading: "Gestão e Revogação",
          content:
            "Revogação de licença é realizada on-chain; nós com licença revogada perdem o direito de ativar o NTE e participar da governança.",
        },
      ],
    },

    sdk: {
      title: "SDK — Cliente Programático",
      tldr: "O SDK fornece interfaces para verificar status de nós, submeter PoU, consultar roots Merkle e interagir com o registro de licenças na Scroll L2. Projetado para Node.js e browser (readonly).",
      sections: [
        {
          heading: "Instalação",
          content: "npm install @sne/sdk --save",
        },
        {
          heading: "Exemplo (verificar status)",
          content:
            "use const client = new SNEClient({ provider: ethersProvider, network: 'scroll-mainnet' }); const status = await client.getNodeStatus(nodeId);",
        },
        {
          heading: "Segurança",
          content:
            "O SDK não deve gerenciar chaves privadas em ambientes não confiáveis. Operações de assinatura devem ser delegadas ao SNE Pass ou hardware wallet.",
        },
      ],
    },

    contracts: {
      title: "Contratos — SNELicenseRegistry & Merkle Anchor",
      tldr: "Conjunto de contratos on-chain para registro de licenças, submissão de Merkle roots e validação de PoU. Implementados como proxy upgradeable para permitir atualizações seguras.",
      sections: [
        {
          heading: "SNELicenseRegistry",
          content:
            "Registro de licenças (NFT), função checkAccess(nodeID) e eventos para auditoria. Usar padrões ERC-721 e OpenZeppelin Proxy para upgrades.",
        },
        {
          heading: "Merkle Anchor",
          content:
            "Contrato para ancoragem de raízes Merkle e verificação de proofs. Recebe batches de roots e emite eventos indexáveis para auditores.",
        },
        {
          heading: "Boas práticas",
          content:
            "Auditabilidade, limites de gas, e mecanismos de emergency stop são recomendados. Testes formais e auditorias externas devem ser parte do ciclo de release.",
        },
      ],
    },

    rest: {
      title: "REST API — Endpoints Operacionais",
      tldr: "API REST para consulta de estado, submissão de provas off-chain e integração com dashboards de auditoria. Endpoints projetados para readonly em frontends públicos.",
      sections: [
        {
          heading: "Endpoints principais",
          content:
            "/nodes/:id/status — retorna uptime e lastProof; /pou/submit — endpoint para relayers submeturem payloads PoU; /merkle/roots — lista de roots recentes.",
        },
        {
          heading: "Autenticação",
          content:
            "APIs de submissão aceitam JWT assinados por relayers autorizados. Endpoints públicos são readonly e cacheáveis.",
        },
        {
          heading: "Rate-limiting e Resiliência",
          content:
            "Impor rate-limits em endpoints de escrita; usar filas de processamento e re-tentativa para submissões de relayers.",
        },
      ],
    },

    "exec-env": {
      title: "Ambiente de Execução Confiável e Memória Volátil",
      tldr: "A lógica e os pesos do modelo (θ) nunca residem em armazenamento legível; são descriptografados apenas em RAM após handshake on-chain, com mecanismos de zeroization física.",
      sections: [
        {
          heading: "Carregamento de Pesos e AES-256",
          content:
            "Após o handshake bem-sucedido com o registro de licenças na Scroll L2, o NTE é descriptografado via AES-256 diretamente na memória RAM. Não há persistência em disco; em caso de interrupção elétrica ou reinicialização, vestígios operacionais são eliminados.",
        },
        {
          heading: "Conectividade e Ingestão de Dados",
          content:
            'O nó minimize dependência de infraestruturas terrestres. A integração opcional com comunicação via satélite permite ingestão direta de transmissões de mercado, contornando ISPs. O tensor Vt é construído localmente a partir de pacotes brutos (raw packets) seguindo o princípio de "Entrada Direta".',
        },
        {
          heading: "Especificações de Segurança Física (Tamper-Resistance)",
          content:
            "O chassi contém uma malha de sensores de continuidade elétrica (Tamper-Detection Line). Qualquer abertura física interrompe o circuito e dispara zeroization de hardware, removendo instantaneamente a alimentação do elemento seguro que contém as chaves de sessão.",
        },
      ],
    },

    nte: {
      title: "O Motor de Inferência Determinístico (NTE)",
      tldr: "O NTE converte sinais brutos em decisões por agregação ponderada seguida de Softmax, executando todos os cálculos em memória volátil para proteger IP e evitar persistência de decisões.",
      sections: [
        {
          heading: "Função de Execução",
          content:
            "A saída do sistema (y_t) é um escalar de probabilidade calculado via Softmax sobre a soma ponderada das camadas de análise: y_t = Softmax( Σ_{i∈Layers} w_i · Score_i(V_t) ).",
        },
        {
          heading: "Execução em Memória Volátil",
          content:
            "A computação de y_t ocorre exclusivamente em RAM. Os pesos (θ) são carregados apenas após validação do handshake com a Scroll. Não há persistência de logs de decisão em disco, mitigando análise forense.",
        },
        {
          heading: "Composição do Tensor Vt",
          content:
            "Vt = [Ot, Tt, Ut, Bt, Pt, Dt], onde Ot=Osciladores de Momentum (RSI, Williams%R, CCI), Tt=Indicadores de Tendência (EMA, ADX, PSAR), Ut=Dinâmica de Volume (MFI, OBV), Bt=Bandas de Volatilidade, Pt=Heurística de Padrões e Dt=Fluxo DOM (Bid/Ask ratio). Quando disponível, o processamento usa instruções vetoriais AVX-512 para desempenho determinístico.",
        },
        {
          heading: "Pesos Canônicos",
          content:
            "O protocolo define pesos canônicos que priorizam microestrutura e liquidez: wMTF=3.0, wDOM=2.5, wZONES=2.0, wSENT=1.5, wVOL=1.0. Esses parâmetros são geridos via SNIPs on-chain.",
        },
      ],
      code: `// Fórmula (exemplo)
// y_t = Softmax( sum_i w_i * Score_i(V_t) )

// Pesos canônicos (exemplo)
const w = {
  mft: 3.0,
  dom: 2.5,
  zones: 2.0,
  sent: 1.5,
  vol: 1.0,
};

// Observação: todo cálculo ocorre em memória volátil e buffers críticos devem ser mlock()'ed.
`,
    },

    pou: {
      title: "Ontologia da Prova de Uptime (PoU)",
      tldr: "PoU formaliza a corporeidade digital: um heartbeat contendo nonce, ID do nó e métricas do ASIC é assinado e submetido à Scroll L2, provando existência física do hardware.",
      sections: [
        {
          heading: "Formato do Heartbeat",
          content:
            "payloadPoU = H(nonce || IDnode || timestamp || PCRs || ASICmetric); proofPoU = Sign_EK(payloadPoU). O heartbeat é enviado periodicamente ao contrato SNELicenseRegistry (0x2577...9fb7) na Scroll L2.",
        },
        {
          heading: "Função no Governança",
          content:
            "Pvoto é proporcional ao histórico de disponibilidade comprovada: Pvoto ∝ ∫_{t0}^{tAtual} Proofuptime(t) dt. Isso alinha incentivos e garante que operadores com integridade física tenham maior voz na evolução do protocolo.",
        },
      ],
      code: `# Gerar heartbeat PoU (exemplo simplificado)
nonce=$(openssl rand -hex 32)
payload="||$NODE_ID||$(date -u +%s)||$PCRS||$ASIC_METRIC"
hash=$(echo -n "$payload" | openssl dgst -sha256 -binary | xxd -p -c 256)
# Assinar com chave do nó (placeholder)
echo "$hash" | openssl dgst -sha256 -sign node_private.pem | base64
# Submeter ao contrato via rpc/provider (pseudocódigo)
# sne client submit-pou --payload $payload --sig $signature --contract 0x2577...9fb7`,
    },

    "sne-pass": {
      title: "SNE Pass — Núcleo de Soberania e Auto-Custódia",
      tldr: "SNE Pass opera dentro do Secure Element (TPM/TEE). Gera assinaturas, gerencia counters monotônicos e nunca expõe material sensível ao SNE Radar ou à rede pública.",
      sections: [
        {
          heading: "Airgap Lógico e Segregação",
          content:
            "SNE Radar (read-only) processa Vt para leitura do mercado. SNE Pass detém privilégios de escrita e assinatura no SE, reduzindo o vetor de exfiltração de chaves.",
        },
        {
          heading: "Protocolo de Assinatura e Handshake",
          content:
            "O acesso ao material em repouso (θ) exige um nonce n, assinatura do operador σ e validação on-chain via checkAccess(nodeID) no contrato SNELicenseRegistry. Somente após validação síncrona o SE libera chaves voláteis via AES-256.",
        },
        {
          heading: "Interação com Wallets Físicas",
          content:
            "Assinatura final requer prova de presença física (PoP). O SNE Pass orquestra integração com hardware wallets isoladas e usa monotonic counters e HKDF para derivar chaves de sessão temporárias.",
        },
      ],
    },

    "sne-box": {
      title: "SNE Box — Arquitetura Híbrida (Tier 3)",
      tldr: "SNE Box combina controlador ARM (Raspberry Pi) com acelerador criptográfico ASIC (BitAxe). Implementa isolamento galvânico, kill-switch físico e Root of Trust entre módulos.",
      sections: [
        {
          heading: "Módulos e Funções",
          content:
            "Módulo de Inteligência (ARM) roda o SNE Radar, processa Vt e coordena provas. Módulo de Resiliência (BitAxe) executa hashing contínuo como heartbeat e prova física; sua telemetria é encapsulada e enviada ao contrato na Scroll L2.",
        },
        {
          heading: "Root of Trust e Kill Switch",
          content:
            "A integração entre ARM e BitAxe estabelece um Root of Trust. Uma violação física da Tamper Line dispara zeroization na RAM e interrompe o BitAxe, sinalizando a queda do nó na rede.",
        },
      ],
    },

    hardware: {
      title: "Especificações de Hardware e Topologia",
      tldr: "Classificação de tiers, requisitos de AVX-512 para nós de alta frequência e integração de TEE/SE para custódia.",
      sections: [
        {
          heading: "Classificação de Níveis",
          content:
            "Tier 1: Pro Node (AVX-512). Tier 2: Edge Node (ARM/x86). Tier 3: SNE Box (Secure Enclave + satélite).",
        },
        {
          heading: "Requisitos de Tempo Real e Fluxo de Dados",
          content:
            "Processamento do tensor Vt exige instruções vetoriais quando performance é crítica; I/O determinístico e isolamento de IRQs são recomendados para reduzir jitter. O sistema prioriza conexões P2P ou via satélite para ingestão direta de dados.",
        },
      ],
    },

    governance: {
      title: "Governança e Evolução do Protocolo",
      tldr: "Parâmetros do NTE e pesos canônicos são geridos via SNIPs on-chain com votação ponderada por licença e execução via Proxy Patterns para atualizações atômicas.",
      sections: [
        {
          heading: "Processo de Proposta e Votação",
          content:
            "SNIPs são propostas técnicas; votação é ponderada por uptime comprovado e tempo de posse da licença. Execução técnica usa padrões Proxy (OpenZeppelin) para evitar downtime.",
        },
        {
          heading: "Incentivos e Resistência Anti-Sybil",
          content:
            "O PoU mitiga Sybil attacks ao exigir prova computacional associada ao heartbeat; isso torna economicamente inviável operar nós falsos em escala.",
        },
      ],
    },

    appendix: {
      title:
        "Appendix A: Gerenciamento de Memória e Vetorização",
      tldr: "Notas técnicas sobre manipulação de memória, uso de AVX-512 e mitigação de canais laterais.",
      sections: [
        {
          heading: "Melhores Práticas",
          content:
            "Alocar buffers em páginas não-swapped, usar mlock para fixar memória crítica, aplicar mitigação de canais laterais ao usar AVX-512 e reduzir contention em ambientes multi-tenant.",
        },
      ],
    },

    conclusion: {
      title: "Conclusão",
      tldr: "SNE Vault articula uma arquitetura híbrida que reconcili a necessidade de leitura de mercado em tempo real com a proteção física de custódia, usando TEE, zeroization e provas on-chain.",
      sections: [
        {
          heading: "Resumo",
          content:
            "A segregação entre SNE Radar e SNE Pass, aliada ao registro de PoU na Scroll L2, torna a extração de material criptográfico computacionalmente e fisicamente inviável sob modelos de adversário realistas.",
        },
      ],
    },
  };

  // ---------- Hash helpers ----------
  const getDocFromHash = () => {
    if (typeof window === "undefined") return "overview";
    const raw = window.location.hash || "";
    const candidate = raw.replace("#", "").trim();
    if (!candidate) return "overview";
    // garantimos que existe no conteúdo
    if (
      Object.prototype.hasOwnProperty.call(content, candidate)
    )
      return candidate;
    return "overview";
  };

  // selectedDoc é inicializado a partir do hash (SSR-safe)
  const [selectedDoc, setSelectedDoc] = useState<string>(() => {
    try {
      return getDocFromHash();
    } catch {
      return "overview";
    }
  });

  // Quando selectedDoc muda, sincroniza o URL se necessário e rola o conteúdo para o topo
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentHash = window.location.hash.replace("#", "");
    if (currentHash !== selectedDoc) {
      // usamos replaceState para não poluir o histórico se o change veio do clique local.
      // Se preferir pushState, ajuste conforme UX desejada.
      window.history.replaceState(
        {},
        "",
        `/docs#${selectedDoc}`,
      );
    }

    // rola o main para o topo (smooth)
    // se preferir painel interno, use mainRef
    if (mainRef.current) {
      try {
        mainRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedDoc]);

  // Escuta hashchange / popstate (back/forward e Products.openDoc que despacha hashchange)
  useEffect(() => {
    const onHash = () => {
      const doc = getDocFromHash();
      setSelectedDoc(doc);
      // rola para o topo quando a hash muda (UX consistente)
      if (mainRef.current) {
        try {
          mainRef.current.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        } catch {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);

    // se a hash mudou antes do mount, sincroniza
    onHash();

    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentContent =
    content[selectedDoc] || content.overview;

  // Bloqueia scroll do body quando drawer mobile estiver aberto
  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex flex-1">
      {/* Desktop Docs Sidebar - Fixed positioning like main sidebar */}
      <aside
        className="hidden lg:block fixed left-80 top-16 bottom-0 w-64 border-r overflow-y-auto"
        style={{
          backgroundColor: "var(--bg-2)",
          borderColor: "var(--stroke-1)",
        }}
      >
        <div className="p-5">
          <DocsSidebar
            sections={sections}
            selectedDoc={selectedDoc}
            onSelect={(id: string) => {
              setSelectedDoc(id);
            }}
          />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <MobileDrawer onClose={() => setSidebarOpen(false)}>
          <div className="p-6">
            <DocsSidebar
              sections={sections}
              selectedDoc={selectedDoc}
              onSelect={(id: string) => {
                setSelectedDoc(id);
              }}
              closeOnSelect={() => setSidebarOpen(false)}
              showHeader
            />
          </div>
        </MobileDrawer>
      )}

      {/* Main Content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto lg:ml-64">
          <div className="max-w-4xl mx-auto">
            {/* Mobile toggle button - Show on all screens smaller than lg */}
            <div className="mb-6 lg:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded"
                aria-label="Abrir índice de documentação"
                style={{
                  backgroundColor: "var(--bg-2)",
                  color: "var(--text-1)",
                  border: "1px solid var(--stroke-1)",
                }}
              >
                <Search className="w-4 h-4" />
                Índice da Documentação
              </button>
            </div>

          {/* Header */}
          <div className="mb-6">
            <div className="mb-3">
              <StatusBadge status="active">
                Documentação
              </StatusBadge>
            </div>
            <h1
              className="text-xl font-semibold mb-4 break-words"
              style={{ color: "var(--text-1)" }}
            >
              {currentContent.title}
            </h1>
            {currentContent.tldr && (
              <div
                className="p-4 rounded-lg border-l-4 mb-4 break-words"
                style={{
                  backgroundColor: "var(--bg-2)",
                  borderColor: "var(--accent-orange)",
                }}
              >
                <h4
                  className="text-sm font-medium mb-2 uppercase tracking-wide"
                  style={{ color: "var(--text-1)" }}
                >
                  TL;DR
                </h4>
                <p
                  className="text-sm break-words whitespace-normal"
                  style={{
                    color: "var(--text-2)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    lineHeight: 1.5,
                  }}
                >
                  {currentContent.tldr}
                </p>
              </div>
            )}
          </div>

          {/* Content Sections */}
          <div className="space-y-5 break-words">
            {currentContent.sections?.map(
              (section: any, idx: number) => (
                <div key={idx}>
                  <h2
                    className="text-lg font-semibold mb-3 break-words"
                    style={{ color: "var(--text-1)" }}
                  >
                    {section.heading}
                  </h2>
                  {section.content && (
                    <p
                      className="mb-4 text-sm break-words whitespace-normal"
                      style={{
                        color: "var(--text-2)",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                        lineHeight: 1.6,
                      }}
                    >
                      {section.content}
                    </p>
                  )}
                </div>
              ),
            )}

            {/* Optional code blocks for certain docs */}
            {selectedDoc === "quickstart" && (
              <div>
                <h3
                  className="text-base font-semibold mb-3 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Instalação
                </h3>
                <div className="overflow-auto">
                  <CodeBlock
                    language="bash"
                    code={`# Instalar via npm
npm install -g @sne/cli

# Ou via Rust
cargo install sne-node

# Verificar instalação
sne --version`}
                  />
                </div>

                <h3
                  className="text-base font-semibold mt-6 mb-3 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Configuração Inicial
                </h3>
                <div className="overflow-auto">
                  <CodeBlock
                    language="bash"
                    code={`# Registrar nó (requer licença on-chain)
sne register \\
  --wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0 \\
  --license-id 42 \\
  --network scroll

# Iniciar nó com heartbeat de 30s
sne start \\
  --heartbeat 30s \\
  --rpc https://scroll-sepolia.chainstacklabs.com`}
                  />
                </div>

                <div
                  className="mt-6 p-4 rounded-lg border break-words"
                  style={{
                    backgroundColor: "var(--bg-2)",
                    borderColor: "var(--stroke-1)",
                  }}
                >
                  <h4
                    className="mb-2 break-words"
                    style={{ color: "var(--text-1)" }}
                  >
                    Note
                  </h4>
                  <p
                    className="break-words whitespace-normal"
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "var(--text-body)",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    A licença SNE é um NFT ERC-721 que deve ser
                    adquirido antes de registrar o nó. Veja a
                    seção{" "}
                    <a
                      href="#keys"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedDoc("keys");
                      }}
                      style={{ color: "var(--accent-orange)" }}
                    >
                      SNE Keys
                    </a>{" "}
                    para detalhes.
                  </p>
                </div>
              </div>
            )}

            {selectedDoc === "overview" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Fluxo de Dados
                </h3>
                <ol
                  className="space-y-3 mb-6"
                  style={{
                    listStyle: "decimal",
                    paddingLeft: "1.5rem",
                  }}
                >
                  {[
                    "Operador registra nó on-chain com licença válida",
                    "Nó inicia heartbeat periódico (tipicamente 30s)",
                    "Provas de uptime são assinadas e enviadas a relayers",
                    "Relayers agregam provas em Merkle trees",
                    "Merkle roots são submetidos em batch à Scroll L2",
                    "Auditores podem verificar provas via challenge-response",
                  ].map((step, idx) => (
                    <li
                      key={idx}
                      className="break-words"
                      style={{
                        color: "var(--text-1)",
                      }}
                    >
                      {step}
                    </li>
                  ))}
                </ol>

                <h3
                  className="text-base font-semibold mb-3 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Para Implementadores
                </h3>
                <div className="overflow-auto">
                  <CodeBlock
                    language="typescript"
                    code={`import { SNEClient } from '@sne/sdk';

const client = new SNEClient({
  provider: ethersProvider,
  network: 'scroll-mainnet',
});

// Verificar status de nó (exemplo ilustrativo - execute em ambiente Node/Browser com provider)
(async function() {
  const status = await client.getNodeStatus('0x4a7b...c3f9');
  console.log(\`Uptime: \${status.uptime}%\`);
  console.log(\`Last proof: \${status.lastProof}\`);
})();`}
                  />
                </div>
              </div>
            )}

            {selectedDoc === "radar" && (
              <div>
                <h3
                  className="text-base font-semibold mb-3 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  SNE Radar — Detalhes de Implementação
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {content.radar.sections
                    .map((s: any) => s.content)
                    .join("\n\n")}
                </p>
              </div>
            )}

            {selectedDoc === "vault" && (
              <div>
                <h3
                  className="text-base font-semibold mb-3 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  SNE Vault — Detalhes de Implementação
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {content.vault.sections
                    .map((s: any) => s.content)
                    .join("\n\n")}
                </p>
              </div>
            )}

            {selectedDoc === "keys" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  SNE Keys — Licenças e Operação
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {content.keys.sections
                    .map((s: any) => s.content)
                    .join("\n\n")}
                </p>
              </div>
            )}

            {selectedDoc === "sdk" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  SDK — Exemplos e Observações
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {content.sdk.sections
                    .map((s: any) => s.content)
                    .join("\n\n")}
                </p>
              </div>
            )}

            {selectedDoc === "contracts" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Contratos — Design e Boas Práticas
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {content.contracts.sections
                    .map((s: any) => s.content)
                    .join("\n\n")}
                </p>
              </div>
            )}

            {selectedDoc === "rest" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  REST API — Endpoints e Fluxos
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {content.rest.sections
                    .map((s: any) => s.content)
                    .join("\n\n")}
                </p>
              </div>
            )}

            {selectedDoc === "pou" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Exemplo: Gerar e Submeter PoU
                </h3>
                <div className="overflow-auto">
                  <CodeBlock
                    language="bash"
                    code={content.pou.code}
                  />
                </div>

                <div
                  className="mt-6 p-4 rounded-lg border break-words"
                  style={{
                    backgroundColor: "var(--bg-2)",
                    borderColor: "var(--stroke-1)",
                  }}
                >
                  <h4
                    className="mb-2 break-words"
                    style={{ color: "var(--text-1)" }}
                  >
                    Observação Técnica
                  </h4>
                  <p
                    className="break-words whitespace-normal"
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "var(--text-body)",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    O PoU combina fatores de hardware (PCRs,
                    ASIC metrics) com nonce e timestamp para
                    tornar caro e difícil falsificar a
                    existência física do nó.
                  </p>
                </div>
              </div>
            )}

            {selectedDoc === "nte" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Fórmula de Execução (exemplo)
                </h3>
                <div className="overflow-auto">
                  <CodeBlock
                    language="text"
                    code={content.nte.code}
                  />
                </div>

                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  Todos os cálculos ocorrem em memória volátil;
                  o NTE não grava decisões em disco. Utilize
                  mlock e práticas de gerenciamento de memória
                  para proteger buffers críticos.
                </p>
              </div>
            )}

            {selectedDoc === "sne-pass" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Operação do SNE Pass
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  O SNE Pass vive no Secure Element. Para
                  operações que exigem presença física, o SE
                  valida a SNE Physical Key e usa monotonic
                  counters e HKDF para derivar chaves de sessão
                  temporárias.
                </p>
              </div>
            )}

            {selectedDoc === "sne-box" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Componentes do SNE Box
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  Controlador ARM + BitAxe ASIC + Secure
                  Element. A integração entre módulos cria o
                  Root of Trust e o fluxo sincronizado de provas
                  submetidas à Scroll L2.
                </p>
              </div>
            )}

            {selectedDoc === "hardware" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Tiers e Requisitos
                </h3>
                <ul style={{ paddingLeft: "1.25rem" }}>
                  <li
                    className="break-words"
                    style={{ color: "var(--text-1)" }}
                  >
                    Tier 1: AVX-512, alta frequência.
                  </li>
                  <li
                    className="break-words"
                    style={{ color: "var(--text-1)" }}
                  >
                    Tier 2: Edge ARM/x86.
                  </li>
                  <li
                    className="break-words"
                    style={{ color: "var(--text-1)" }}
                  >
                    Tier 3: SNE Box com TEE/SE e satélite
                    integrado.
                  </li>
                </ul>
              </div>
            )}

            {selectedDoc === "governance" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  SNIPs e Atualizações Seguras
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  Use SNIPs para propor mudanças. A votação é
                  ponderada por uptime comprovado; a execução
                  técnica usa patterns Proxy para evitar
                  downtime durante atualizações de lógica.
                </p>
              </div>
            )}

            {selectedDoc === "appendix" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Gerenciamento de Memória
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  Recomenda-se utilizar mlock para manter áreas
                  críticas na RAM, evitar swap e aplicar
                  mitigação de canais laterais quando instruções
                  vetoriais são usadas.
                </p>
              </div>
            )}

            {selectedDoc === "conclusion" && (
              <div>
                <h3
                  className="mb-4 break-words"
                  style={{ color: "var(--text-1)" }}
                >
                  Conclusão
                </h3>
                <p
                  className="break-words whitespace-normal"
                  style={{
                    color: "var(--text-secondary)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  A segregação entre SNE Radar e SNE Pass,
                  aliada ao registro de PoU na Scroll L2, torna
                  a extração de material criptográfico
                  computacionalmente e fisicamente inviável sob
                  modelos de adversário realistas.
                </p>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div
            className="mt-12 pt-8 border-t flex items-center justify-between"
            style={{ borderColor: "var(--stroke-1)" }}
          >
            <button
              onClick={() => {
                // navega para o doc anterior na lista linear (UX simples)
                const flat = Object.keys(content);
                const idx = flat.indexOf(selectedDoc);
                if (idx > 0) setSelectedDoc(flat[idx - 1]);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--stroke-1)",
              }}
            >
              ← Anterior
            </button>
            <button
              onClick={() => {
                const flat = Object.keys(content);
                const idx = flat.indexOf(selectedDoc);
                if (idx >= 0 && idx < flat.length - 1)
                  setSelectedDoc(flat[idx + 1]);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded transition-colors"
              style={{
                backgroundColor: "var(--accent-orange)",
                color: "var(--text-1)",
              }}
            >
              Próximo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   DocsSidebar component
   reutilizável para desktop + mobile
   --------------------------- */
function DocsSidebar({
  sections,
  selectedDoc,
  onSelect,
  closeOnSelect,
  showHeader,
}: {
  sections: Section[];
  selectedDoc: string;
  onSelect: (id: string) => void;
  closeOnSelect?: () => void;
  showHeader?: boolean;
}) {
  // Quando o usuário clica em um item do sidebar, além de setSelectedDoc chamamos onSelect.
  // A sincronização de URL é tratada pelo Docs (useEffect).
  return (
    <>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldIconSmall />
            <span
              style={{
                color: "var(--text-1)",
                fontFamily: "var(--font-family-ui)",
              }}
            >
              Docs
            </span>
          </div>
        </div>
      )}

      <div className="relative mb-6">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--text-secondary)" }}
        />
        <Input
          placeholder="Buscar docs..."
          className="pl-10"
          style={{
            backgroundColor: "var(--bg-1)",
            borderColor: "var(--stroke-1)",
            color: "var(--text-1)",
          }}
        />
      </div>

      <nav
        className="space-y-6"
        aria-label="Sidebar de documentação"
      >
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-3">
                <Icon
                  className="w-4 h-4"
                  style={{ color: "var(--text-secondary)" }}
                />
                <h3
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "var(--text-small)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {section.title}
                </h3>
              </div>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        // atualiza o doc mostrado — Docs sincroniza o hash/URL
                        onSelect(item.id);
                        if (closeOnSelect) closeOnSelect();
                      }}
                      aria-current={
                        selectedDoc === item.id
                          ? "true"
                          : undefined
                      }
                      className="w-full text-left px-3 py-2 rounded transition-all flex items-center gap-2 break-words"
                      style={{
                        color:
                          selectedDoc === item.id
                            ? "var(--accent-orange)"
                            : "var(--text-1)",
                        backgroundColor:
                          selectedDoc === item.id
                            ? "var(--bg-3)"
                            : "transparent",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {selectedDoc === item.id && (
                        <ChevronRight
                          className="w-3 h-3"
                          style={{ color: "var(--accent-orange)" }}
                        />
                      )}
                      <span
                        className="break-words"
                        style={{
                          fontSize: "var(--text-body)",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </>
  );
}

/* ---------------------------
   MobileDrawer component
   overlay + simple focus-trap + ESC handling
   --------------------------- */
function MobileDrawer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", onKey);
    setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length) focusable[0].focus();
    }, 0);

    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menu de documentação"
    >
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
        style={{ background: "rgba(0,0,0,0.5)" }}
      >
      </div>
      <div
        ref={panelRef}
        className="absolute left-0 top-0 bottom-0 w-72 p-6 overflow-y-auto"
        style={{
          backgroundColor: "var(--bg-2)",
          borderRight: "1px solid var(--stroke-1)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldIconSmall />
            <span
              style={{
                color: "var(--text-1)",
                fontFamily: "var(--font-family-ui)",
              }}
            >
              Docs
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded"
            aria-label="Fechar menu de documentos"
            style={{ color: "var(--text-secondary)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* ícone inline para o header do drawer / sidebar */
function ShieldIconSmall() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 2l7 3v5c0 5-3.5 9.8-7 11-3.5-1.2-7-6-7-11V5l7-3z"
        fill="currentColor"
      />
    </svg>
  );
}
