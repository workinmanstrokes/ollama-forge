export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#241810" />
      <path d="M32 8c2.4 9 9 13.5 9 22.5a9 9 0 0 1-18 0C23 21.5 29.6 17 32 8z" fill="#ff6a2c" />
      <path d="M32 22c1.4 5 4.6 7.4 4.6 12a4.6 4.6 0 0 1-9.2 0c0-4.6 3.2-7 4.6-12z" fill="#ffd48a" />
      <path d="M14 46h36l-4 6H18z" fill="#f0d0b0" />
      <rect x="24" y="51" width="16" height="5" rx="1.5" fill="#c4926a" />
    </svg>
  );
}
