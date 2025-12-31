import { FileText, BookOpen, Shield, AlertTriangle, Search } from 'lucide-react';

export function Docs() {
  const sections = [
    { title: 'Quickstart', icon: FileText, description: 'Get up and running with SNE OS in minutes' },
    { title: 'Whitepaper', icon: BookOpen, description: 'Technical architecture and protocol design' },
    { title: 'Threat Model', icon: Shield, description: 'Security considerations and attack vectors' },
    { title: 'API Reference', icon: FileText, description: 'Complete API documentation and examples' },
  ];

  return (
    <div className="flex-1 px-8 py-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Resources</p>
          <h1 className="text-4xl font-semibold mb-4" style={{ color: 'var(--text-1)' }}>Documentation</h1>
          <p className="text-lg" style={{ color: 'var(--text-2)' }}>
            Everything you need to build with SNE OS
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            <Search size={20} style={{ color: 'var(--text-3)' }} />
            <input
              type="text"
              placeholder="Search documentation..."
              className="bg-transparent outline-none flex-1"
              style={{ color: 'var(--text-1)' }}
            />
            <kbd
              className="px-2 py-1 rounded text-xs font-mono"
              style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-3)' }}
            >
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Doc Sections */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {sections.map((section, index) => (
            <button
              key={index}
              className="p-6 rounded-xl text-left transition-all hover:border-[var(--accent-orange)]"
              style={{
                backgroundColor: 'var(--bg-2)',
                borderWidth: '1px',
                borderColor: 'var(--stroke-1)',
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--bg-3)' }}
                >
                  <section.icon size={24} style={{ color: 'var(--accent-orange)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
                    {section.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                    {section.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Links */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--text-2)' }}>
            Popular Articles
          </h3>
          <div className="space-y-3">
            {[
              'Getting Started with SNE OS',
              'Connecting Your Wallet',
              'Understanding Proof Publishing',
              'API Authentication',
              'Node Setup Guide',
            ].map((article, index) => (
              <button
                key={index}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-3)] transition-colors text-left"
              >
                <span className="text-sm" style={{ color: 'var(--text-1)' }}>{article}</span>
                <span className="text-xs" style={{ color: 'var(--accent-orange)' }}>Read →</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div
          className="mt-6 p-4 rounded-lg flex items-start gap-3"
          style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--warn-amber)' }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--warn-amber)', marginTop: '2px' }} />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-1)' }}>
              Beta Documentation
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              SNE OS is currently in beta. Documentation and APIs are subject to change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
