export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <img
        src={light ? '/branding/zucarmex-white.svg' : '/branding/zucarmex.svg'}
        alt="ZUCARMEX"
        width={213}
        height={44}
      />
      <small>PORTAL DE CLIENTES</small>
    </div>
  );
}
