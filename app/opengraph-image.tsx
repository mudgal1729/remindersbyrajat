import { ImageResponse } from 'next/og'
import { pickTagline } from '@/lib/taglines'

export const alt = 'Reminders by Rajat'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  const tagline = pickTagline()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FFF8E7',
          display: 'flex',
          flexDirection: 'column',
          borderWidth: 14,
          borderStyle: 'solid',
          borderColor: '#1a1a2e',
        }}
      >
        {/* Pink accent bar */}
        <div style={{ height: 18, background: '#E91E8C', display: 'flex', width: '100%' }} />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 88px',
          }}
        >
          {/* Bell icon box */}
          <div
            style={{
              width: 84,
              height: 84,
              background: '#E91E8C',
              borderWidth: 4,
              borderStyle: 'solid',
              borderColor: '#1a1a2e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 36,
              fontSize: 44,
            }}
          >
            🔔
          </div>

          {/* App name */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginBottom: 30,
            }}
          >
            <span
              style={{
                fontSize: 86,
                fontWeight: 900,
                color: '#1a1a2e',
                lineHeight: 1,
                letterSpacing: -2,
              }}
            >
              REMINDERS
            </span>
            <span
              style={{
                fontSize: 86,
                fontWeight: 900,
                color: '#1a1a2e',
                lineHeight: 1,
                letterSpacing: -2,
              }}
            >
              BY RAJAT
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 34,
              color: '#E91E8C',
              fontWeight: 600,
              display: 'flex',
            }}
          >
            &ldquo;{tagline}&rdquo;
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            padding: '22px 88px',
            borderTopWidth: 3,
            borderTopStyle: 'solid',
            borderTopColor: '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 26, color: '#1a1a2e', fontWeight: 700 }}>
            remindersbyrajat.xyz
          </span>
          <div
            style={{
              background: '#1a1a2e',
              color: '#FFF8E7',
              padding: '10px 28px',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 2,
              display: 'flex',
            }}
          >
            FREE TO USE
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
