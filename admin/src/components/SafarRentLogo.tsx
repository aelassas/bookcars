import React from 'react'

interface SafarRentLogoProps {
  variant?: 'light' | 'dark'
  size?: 'small' | 'medium' | 'large'
  showBadge?: boolean
  badgeText?: string
}

export const SafarRentLogo: React.FC<SafarRentLogoProps> = ({
  variant = 'dark',
  size = 'medium',
  showBadge = true,
  badgeText = 'CONSOLE'
}) => {
  const iconSizes = {
    small: { w: 30, h: 30, fontSize: 18, textScale: 0.85 },
    medium: { w: 38, h: 38, fontSize: 22, textScale: 1 },
    large: { w: 48, h: 48, fontSize: 28, textScale: 1.25 }
  }

  const current = iconSizes[size]
  const isLight = variant === 'light'
  const safarColor = isLight ? '#FFFFFF' : 'var(--sr-text, #171b24)'
  const rentColor = isLight ? '#ffb84f' : 'var(--sr-accent-text, #995000)' // Trust Emerald
  const subColor = isLight ? '#b4bdca' : 'var(--sr-muted, #596273)'

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none', userSelect: 'none' }}>
      {/* Interlocking S-Curve Highway & Shield Pin Monogram */}
      <svg
        width={current.w}
        height={current.h}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(5, 150, 105, 0.28))' }}
      >
        <defs>
          <linearGradient id="adminEmeraldMint" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="adminMintGlow" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>

        {/* Shield / Pin Background Canvas */}
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="13"
          fill="#0B1120"
          stroke="rgba(16, 185, 129, 0.3)"
          strokeWidth="1.5"
        />

        {/* Interlocking S-Ribbon Path */}
        <path
          d="M11 34C16 34 20 30 24 25L27 21C30 17 33 15 37 15"
          stroke="url(#adminEmeraldMint)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M37 14C32 14 28 18 24 23L21 27C18 31 15 33 11 33"
          stroke="url(#adminMintGlow)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M17 21L24 11C28 9 33 11 36 14C38 17 37 21 33 25L26 34C23 37 18 39 15 36C12 34 11 29 14 25L20 18"
          stroke="url(#adminEmeraldMint)"
          strokeWidth="1.75"
          strokeDasharray="2.5 2.5"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Location Pin Dot */}
        <circle cx="37" cy="15" r="2.5" fill="#10B981" />
        <circle cx="37" cy="15" r="1.2" fill="#0B1120" />
      </svg>

      {/* Wordmark Lockup */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              fontSize: current.fontSize,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: safarColor,
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            Safar<span style={{ color: rentColor, fontWeight: 800 }}>Rent</span>
          </span>

          {showBadge && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: isLight ? '#ffb84f' : 'var(--sr-emerald)',
                background: 'var(--sr-emerald-soft)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '2px 6px',
                borderRadius: 999,
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace"
              }}
            >
              {badgeText}
            </span>
          )}
        </div>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, whiteSpace: 'nowrap' }}>
          <span
            style={{
              fontSize: 8.5 * current.textScale,
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: isLight ? '#ffb84f' : 'var(--sr-emerald)',
              textTransform: 'uppercase',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            Operations
          </span>
          <span aria-hidden="true" style={{ width: 1, height: 9, background: 'rgba(5, 150, 105, 0.4)' }} />
          <span
            style={{
              fontSize: 8 * current.textScale,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: subColor,
              textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif"
            }}
          >
            Fleet Console
          </span>
        </span>
      </div>
    </div>
  )
}

export default SafarRentLogo
