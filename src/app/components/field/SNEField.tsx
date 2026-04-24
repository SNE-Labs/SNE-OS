type SNEFieldProps = {
  pathname: string;
};

type SurfaceField = 'home' | 'radar' | 'intel' | 'vault' | 'pass' | 'keys' | 'docs';

function resolveField(pathname: string): SurfaceField {
  if (pathname.startsWith('/radar')) return 'radar';
  if (pathname.startsWith('/intel') || pathname.startsWith('/blog')) return 'intel';
  if (pathname.startsWith('/vault') || pathname.startsWith('/swaps')) return 'vault';
  if (pathname.startsWith('/pass')) return 'pass';
  if (pathname.startsWith('/keys') || pathname.startsWith('/secrets')) return 'keys';
  if (pathname.startsWith('/docs')) return 'docs';
  return 'home';
}

export function SNEField({ pathname }: SNEFieldProps) {
  const field = resolveField(pathname);

  return (
    <div className={`sne-field sne-field--${field}`} aria-hidden="true">
      <div className="sne-field__cartography" />
      <div className="sne-field__aperture sne-field__aperture--primary" />
      <div className="sne-field__aperture sne-field__aperture--secondary" />
      <div className="sne-field__route sne-field__route--a" />
      <div className="sne-field__route sne-field__route--b" />
      <div className="sne-field__route sne-field__route--c" />
      <div className="sne-field__node sne-field__node--a" />
      <div className="sne-field__node sne-field__node--b" />
      <div className="sne-field__node sne-field__node--c" />
      <div className="sne-field__seal">SNE</div>
    </div>
  );
}
