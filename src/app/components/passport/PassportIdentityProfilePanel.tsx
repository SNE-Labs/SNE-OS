import { useEffect, useState } from 'react';
import { AtSign, Github, Globe, MapPin, Palette, Radio, UserRound } from 'lucide-react';

import type { PassportCustomProfile, PassportProfileInput } from '@/types/passport';
import { formatAddress } from '@/utils/format';

type PassportIdentityProfilePanelProps = {
  profile?: PassportCustomProfile | null;
  identityId?: string | null;
  primaryAddress?: string | null;
  walletsTotal?: number;
  editable?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  title?: string;
  subtitle?: string;
  onSave?: (payload: PassportProfileInput) => void | Promise<void>;
};

function buildDraft(profile?: PassportCustomProfile | null): PassportProfileInput {
  return {
    display_name: profile?.display_name ?? '',
    handle: profile?.handle ?? '',
    bio: profile?.bio ?? '',
    location: profile?.location ?? '',
    website_url: profile?.website_url ?? '',
    avatar_url: profile?.avatar_url ?? '',
    banner_url: profile?.banner_url ?? '',
    accent_color: profile?.accent_color ?? '#ff8c42',
    social_links: {
      x: profile?.social_links?.x ?? '',
      telegram: profile?.social_links?.telegram ?? '',
      github: profile?.social_links?.github ?? '',
    },
  };
}

function buildInitials(name?: string | null) {
  if (!name) return 'ID';
  const tokens = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = tokens.map((token) => token[0]?.toUpperCase() ?? '').join('');
  return initials || 'ID';
}

function profileIdentityLabel(profile?: PassportCustomProfile | null, primaryAddress?: string | null) {
  if (profile?.handle) return `@${profile.handle}`;
  if (primaryAddress) return formatAddress(primaryAddress);
  return 'Conta Passport';
}

export function PassportIdentityProfilePanel({
  profile,
  identityId,
  primaryAddress,
  walletsTotal,
  editable = false,
  isSaving = false,
  errorMessage,
  title = 'Presenca publica',
  subtitle,
  onSave,
}: PassportIdentityProfilePanelProps) {
  const [draft, setDraft] = useState<PassportProfileInput>(() => buildDraft(profile));

  useEffect(() => {
    setDraft(buildDraft(profile));
  }, [profile]);

  const accentColor = draft.accent_color || profile?.accent_color || '#ff8c42';
  const bannerStyle = profile?.banner_url || draft.banner_url
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.28)), url(${profile?.banner_url || draft.banner_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundImage: `radial-gradient(circle at top left, ${accentColor}55, transparent 38%), linear-gradient(135deg, ${accentColor}22, rgba(255,255,255,0.02))`,
      };

  const displayName = draft.display_name || profile?.display_name || 'Perfil sem nome';
  const websiteUrl = draft.website_url || profile?.website_url || '';
  const socialLinks = draft.social_links;

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
            {title}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
            {subtitle ?? 'Perfil publico editavel, ancorado diretamente no checkpoint de identidade.'}
          </div>
        </div>
        {profile ? (
          <div
            className="px-3 py-1 rounded-full text-[11px] uppercase tracking-wide"
            style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            {profile.completion}% completo
          </div>
        ) : null}
      </div>

      <div className="rounded-xl overflow-hidden mb-5" style={{ borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
        <div className="h-28" style={bannerStyle} />
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between gap-3 -mt-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-semibold overflow-hidden"
              style={{ backgroundColor: accentColor, color: '#fff', border: '3px solid var(--bg-2)' }}
            >
              {profile?.avatar_url || draft.avatar_url ? (
                <img
                  src={profile?.avatar_url || draft.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                buildInitials(displayName)
              )}
            </div>

            {walletsTotal ? (
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                {walletsTotal} wallet{walletsTotal > 1 ? 's' : ''} na conta
              </div>
            ) : null}
          </div>

          <div className="mt-3">
            <div className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
              {displayName}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
              {profileIdentityLabel(profile, primaryAddress)}
            </div>
          </div>

          {draft.bio || profile?.bio ? (
            <div className="text-sm mt-3 whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>
              {draft.bio || profile?.bio}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 mt-4">
            {identityId ? (
              <div
                className="px-3 py-1 rounded-full text-[11px]"
                style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                {identityId}
              </div>
            ) : null}
            {(draft.location || profile?.location) ? (
              <div
                className="px-3 py-1 rounded-full text-[11px] inline-flex items-center gap-2"
                style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <MapPin className="w-3 h-3" />
                {draft.location || profile?.location}
              </div>
            ) : null}
            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-full text-[11px] inline-flex items-center gap-2"
                style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <Globe className="w-3 h-3" />
                website
              </a>
            ) : null}
            {socialLinks.x ? (
              <div
                className="px-3 py-1 rounded-full text-[11px] inline-flex items-center gap-2"
                style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <AtSign className="w-3 h-3" />
                {socialLinks.x}
              </div>
            ) : null}
            {socialLinks.telegram ? (
              <div
                className="px-3 py-1 rounded-full text-[11px] inline-flex items-center gap-2"
                style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <Radio className="w-3 h-3" />
                {socialLinks.telegram}
              </div>
            ) : null}
            {socialLinks.github ? (
              <div
                className="px-3 py-1 rounded-full text-[11px] inline-flex items-center gap-2"
                style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <Github className="w-3 h-3" />
                {socialLinks.github}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {editable ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave?.(draft);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                Nome exibido
              </div>
              <input
                type="text"
                value={draft.display_name}
                onChange={(event) => setDraft((current) => ({ ...current, display_name: event.target.value }))}
                placeholder="Renan"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              />
            </label>

            <label className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                Handle
              </div>
              <input
                type="text"
                value={draft.handle}
                onChange={(event) => setDraft((current) => ({ ...current, handle: event.target.value }))}
                placeholder="checkpoint_alpha"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              />
            </label>

            <label className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                Localizacao
              </div>
              <input
                type="text"
                value={draft.location}
                onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                placeholder="Sao Paulo"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              />
            </label>

            <label className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                Website
              </div>
              <input
                type="text"
                value={draft.website_url}
                onChange={(event) => setDraft((current) => ({ ...current, website_url: event.target.value }))}
                placeholder="snelabs.space"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
              Bio
            </div>
            <textarea
              value={draft.bio}
              onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
              placeholder="Operador, pesquisador ou builder. Este texto aparece no lookup publico da conta."
              rows={4}
              className="w-full rounded-lg px-3 py-3 text-sm resize-y"
              style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                Avatar URL
              </div>
              <input
                type="text"
                value={draft.avatar_url}
                onChange={(event) => setDraft((current) => ({ ...current, avatar_url: event.target.value }))}
                placeholder="https://..."
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              />
            </label>

            <label className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                Banner URL
              </div>
              <input
                type="text"
                value={draft.banner_url}
                onChange={(event) => setDraft((current) => ({ ...current, banner_url: event.target.value }))}
                placeholder="https://..."
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              />
            </label>

            <label className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide inline-flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
                <Palette className="w-3 h-3" />
                Accent color
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={draft.accent_color}
                  onChange={(event) => setDraft((current) => ({ ...current, accent_color: event.target.value }))}
                  className="h-10 w-12 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                />
                <input
                  type="text"
                  value={draft.accent_color}
                  onChange={(event) => setDraft((current) => ({ ...current, accent_color: event.target.value }))}
                  placeholder="#ff8c42"
                  className="flex-1 rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                />
              </div>
            </label>

            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide inline-flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
                <UserRound className="w-3 h-3" />
                Sinais sociais
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  value={draft.social_links.x ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      social_links: { ...current.social_links, x: event.target.value },
                    }))
                  }
                  placeholder="X handle"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                />
                <input
                  type="text"
                  value={draft.social_links.telegram ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      social_links: { ...current.social_links, telegram: event.target.value },
                    }))
                  }
                  placeholder="Telegram handle"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                />
                <input
                  type="text"
                  value={draft.social_links.github ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      social_links: { ...current.social_links, github: event.target.value },
                    }))
                  }
                  placeholder="GitHub handle"
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                />
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="text-sm" style={{ color: 'var(--danger-red)' }}>
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm" style={{ color: 'var(--text-2)' }}>
              O perfil publico eh resolvido pelo `identity_id`, nao pela wallet isolada.
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: isSaving ? 'rgba(255,140,66,0.45)' : 'var(--accent-orange)',
                color: '#fff',
                opacity: isSaving ? 0.8 : 1,
              }}
            >
              {isSaving ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
