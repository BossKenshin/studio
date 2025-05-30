import type { SVGProps } from 'react';

export function ManualMaestroLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      width="140"
      height="30"
      aria-label="Manual Maestro Logo"
      {...props}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="8" ry="8" fill="url(#logoGradient)" transform="translate(5,5)"/>
      <path d="M15 15 h10 v5 h-10z M15 22.5 h20 v5 h-20z M15 30 h15 v5 h-15z" fill="hsl(var(--primary-foreground))" />
      <text
        x="55"
        y="32"
        fontFamily="var(--font-geist-sans), Arial, sans-serif"
        fontSize="24"
        fontWeight="bold"
        fill="hsl(var(--foreground))"
      >
        ManualMaestro
      </text>
    </svg>
  );
}
