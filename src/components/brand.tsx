export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <svg viewBox="0 0 36 40" width="32" height="36" fill="none" aria-hidden="true">
        <path
          d="M11 35V15M19 35V8M27 35V18"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M19 17C8 17 5 9 5 6c9 0 14 5 14 11ZM19 10c0-6 6-9 11-9 0 6-4 10-11 10M27 24c0-6 4-10 9-10 0 6-3 10-9 10"
          fill="currentColor"
        />
      </svg>
      <div>
        <strong>
          ZUCARMEX<span>®</span>
        </strong>
        <small>PORTAL DE CLIENTES</small>
      </div>
    </div>
  );
}
