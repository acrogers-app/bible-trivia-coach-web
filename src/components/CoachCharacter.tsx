import type { FC } from 'react';

type CoachCharacterProps = {
  className?: string;
};

/**
 * Simple coach character made from basic div shapes.
 * Uses only inline styles (no styled-jsx) to avoid parser issues.
 */
const CoachCharacter: FC<CoachCharacterProps> = ({ className }) => {
  const rootClass =
    ['btc-coach-root', className].filter(Boolean).join(' ');

  return (
    <div
      className={rootClass}
      aria-hidden="true"
      style={{
        position: 'relative',
        width: 220,
        height: 260,
        margin: '0 auto',
      }}
    >
      {/* Floor shadow */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 8,
          width: 140,
          height: 24,
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.35), rgba(0,0,0,0) 70%)',
          opacity: 0.7,
        }}
      />

      {/* Plant */}
      <div
        style={{
          position: 'absolute',
          left: 10,
          bottom: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 60,
            height: 70,
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 8,
              width: 18,
              height: 60,
              borderRadius: 999,
              background:
                'linear-gradient(180deg, #8bd36b, #3c8d40)',
              transformOrigin: 'bottom center',
              transform: 'rotate(-18deg)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 8,
              width: 18,
              height: 60,
              borderRadius: 999,
              background:
                'linear-gradient(180deg, #8bd36b, #3c8d40)',
              transformOrigin: 'bottom center',
              transform: 'rotate(18deg)',
            }}
          />
        </div>

        <div
          style={{
            width: 32,
            height: 68,
            borderRadius: 18,
            background:
              'linear-gradient(180deg, #f0c07a, #d7924a)',
          }}
        />
      </div>

      {/* Character container */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 24,
          transform: 'translateX(-50%)',
          width: 150,
          height: 200,
        }}
      >
        {/* Head and hat */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 78,
              height: 26,
              borderRadius: 16,
              background:
                'linear-gradient(180deg, #f7d36e, #e7b641)',
              marginBottom: 6,
            }}
          />
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#f6d1a4',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 0 rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 14,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#111827',
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#111827',
                }}
              />
            </div>
            <div
              style={{
                width: 18,
                height: 3,
                borderRadius: 999,
                background: '#111827',
              }}
            />
          </div>
        </div>

        {/* Hoodie / torso */}
        <div
          style={{
            position: 'absolute',
            top: 52,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 150,
            height: 120,
            borderRadius: 32,
            background:
              'linear-gradient(135deg, #f0644a, #d93a3a)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            textAlign: 'center',
            boxShadow: '0 10px 20px rgba(0,0,0,0.35)',
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            Bible
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            Coach
          </div>
        </div>

        {/* Left arm */}
        <div
          style={{
            position: 'absolute',
            top: 72,
            left: 4,
            width: 28,
            height: 84,
            borderRadius: 16,
            background:
              'linear-gradient(135deg, #f0644a, #d93a3a)',
            transform: 'rotate(8deg)',
          }}
        />

        {/* Right arm (raised) */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            right: 0,
            width: 28,
            height: 100,
            borderRadius: 16,
            background:
              'linear-gradient(135deg, #f0644a, #d93a3a)',
            transformOrigin: 'top center',
            transform: 'rotate(-30deg)',
          }}
        />

        {/* Legs */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 18,
          }}
        >
          {[0, 1].map((idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 40,
                  borderRadius: 8,
                  background: '#25272c',
                }}
              />
              <div
                style={{
                  width: 14,
                  height: 32,
                  background: '#f6d1a4',
                }}
              />
              <div
                style={{
                  width: 18,
                  height: 12,
                  background: '#ffffff',
                }}
              />
              <div
                style={{
                  width: 40,
                  height: 18,
                  borderRadius: 6,
                  background: '#22a66b',
                  boxShadow: '0 3px 0 rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 10,
                    borderRadius: 4,
                    border: '2px solid #ffffff',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CoachCharacter;
