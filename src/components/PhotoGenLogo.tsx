import type { HTMLAttributes } from 'react';

type PhotoGenLogoProps = HTMLAttributes<HTMLSpanElement> & {
  title?: string;
};

export default function PhotoGenLogo({ title = 'PhotoGen', className, ...props }: PhotoGenLogoProps) {
  return (
    <span className={className} role="img" aria-label={title} {...props}>
      <img
        src="/brand/photogen-header-mark-transparent.png"
        alt=""
        aria-hidden="true"
        width="32"
        height="32"
        style={{
          display: 'block',
          width: '32px',
          height: '32px',
          objectFit: 'contain',
          flex: '0 0 32px',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          background: 'linear-gradient(135deg, #F7DFA3 0%, #D4AF37 50%, #9F7124 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: '#D4AF37',
          fontFamily: 'Inter, Arial, sans-serif',
          fontSize: '20px',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 0,
        }}
      >
        PhotoGen
      </span>
    </span>
  );
}