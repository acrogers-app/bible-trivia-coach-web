import React from 'react';

type CoachCharacterProps = {
  className?: string;
};

/**
 * A simple, CSS-drawn character similar to your mobile mockup.
 * No images or external libraries – just divs + CSS.
 */
const CoachCharacter: React.FC<CoachCharacterProps> = ({ className }) => {
  return (
    <div
      className={\`btc-coach-root \${className ?? ''}\`}
      aria-hidden="true"
    >
      {/* Floor shadow */}
      <div className="btc-coach-floor" />

      {/* Plant on the side */}
      <div className="btc-plant">
        <div className="btc-plant-leaves">
          <div className="btc-plant-leaf btc-plant-leaf--left" />
          <div className="btc-plant-leaf btc-plant-leaf--right" />
        </div>
        <div className="btc-plant-pot" />
      </div>

      {/* Main character */}
      <div className="btc-character">
        {/* Head + hat */}
        <div className="btc-head-wrapper">
          <div className="btc-hat" />
          <div className="btc-head">
            <div className="btc-eyes">
              <span className="btc-eye" />
              <span className="btc-eye" />
            </div>
            <div className="btc-mouth" />
          </div>
        </div>

        {/* Hoodie / torso */}
        <div className="btc-hoodie">
          <span className="btc-hoodie-text-top">Bible</span>
          <span className="btc-hoodie-text-bottom">Coach</span>
        </div>

        {/* Arms */}
        <div className="btc-arm btc-arm-left" />
        <div className="btc-arm btc-arm-right" />

        {/* Legs + shoes */}
        <div className="btc-legs">
          <div className="btc-leg">
            <div className="btc-shorts" />
            <div className="btc-skin" />
            <div className="btc-sock" />
            <div className="btc-shoe">
              <div className="btc-shoe-line" />
            </div>
          </div>
          <div className="btc-leg">
            <div className="btc-shorts" />
            <div className="btc-skin" />
            <div className="btc-sock" />
            <div className="btc-shoe">
              <div className="btc-shoe-line" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{\`
        .btc-coach-root {
          position: relative;
          width: 220px;
          height: 260px;
          margin: 0 auto;
        }

        .btc-coach-floor {
          position: absolute;
          left: 50%;
          bottom: 8px;
          width: 140px;
          height: 24px;
          transform: translateX(-50%);
          background: radial-gradient(
            ellipse at center,
            rgba(0, 0, 0, 0.35),
            transparent 70%
          );
          opacity: 0.7;
        }

        /* Plant */

        .btc-plant {
          position: absolute;
          left: 10px;
          bottom: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .btc-plant-leaves {
          position: relative;
          width: 60px;
          height: 70px;
        }

        .btc-plant-leaf {
          position: absolute;
          bottom: 0;
          width: 18px;
          height: 60px;
          border-radius: 999px;
          background: linear-gradient(#89d36b, #3c8d40);
        }

        .btc-plant-leaf--left {
          left: 8px;
          transform-origin: bottom center;
          transform: rotate(-18deg);
        }

        .btc-plant-leaf--right {
          right: 8px;
          transform-origin: bottom center;
          transform: rotate(18deg);
        }

        .btc-plant-pot {
          width: 32px;
          height: 68px;
          border-radius: 18px;
          background: linear-gradient(#f0c07a, #d7924a);
        }

        /* Character layout */

        .btc-character {
          position: absolute;
          left: 50%;
          bottom: 24px;
          transform: translateX(-50%);
          width: 150px;
          height: 200px;
        }

        /* Head + hat */

        .btc-head-wrapper {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 2;
        }

        .btc-hat {
          width: 78px;
          height: 26px;
          border-radius: 16px;
          background: linear-gradient(#f7d36e, #e7b641);
          margin-bottom: 6px;
        }

        .btc-head {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #f6d1a4;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.15);
        }

        .btc-eyes {
          display: flex;
          gap: 14px;
          margin-bottom: 6px;
        }

        .btc-eye {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #222;
        }

        .btc-mouth {
          width: 18px;
          height: 3px;
          border-radius: 999px;
          background: #222;
        }

        /* Hoodie */

        .btc-hoodie {
          position: absolute;
          top: 52px;
          left: 50%;
          transform: translateX(-50%);
          width: 150px;
          height: 120px;
          border-radius: 32px;
          background: linear-gradient(135deg, #f0644a, #d93a3a);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          text-align: center;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
        }

        .btc-hoodie-text-top {
          font-size: 16px;
          font-weight: 600;
          line-height: 1;
        }

        .btc-hoodie-text-bottom {
          font-size: 18px;
          font-weight: 800;
          line-height: 1.1;
        }

        /* Arms */

        .btc-arm {
          position: absolute;
          top: 70px;
          width: 28px;
          height: 88px;
          border-radius: 16px;
          background: linear-gradient(135deg, #f0644a, #d93a3a);
          z-index: 1;
          transform-origin: top center;
        }

        .btc-arm-left {
          left: 4px;
          transform: rotate(6deg);
        }

        .btc-arm-right {
          right: 0;
          animation: btc-wave 0.8s ease-in-out infinite alternate;
        }

        @keyframes btc-wave {
          from {
            transform: rotate(-30deg);
          }
          to {
            transform: rotate(15deg);
          }
        }

        /* Legs + shoes */

        .btc-legs {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 18px;
          z-index: 0;
        }

        .btc-leg {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .btc-shorts {
          width: 34px;
          height: 40px;
          border-radius: 8px;
          background: #25272c;
        }

        .btc-skin {
          width: 14px;
          height: 32px;
          background: #f6d1a4;
        }

        .btc-sock {
          width: 18px;
          height: 12px;
          background: #ffffff;
        }

        .btc-shoe {
          position: relative;
          width: 40px;
          height: 18px;
          border-radius: 6px;
          background: #2ea66b;
          box-shadow: 0 3px 0 rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btc-shoe-line {
          width: 32px;
          height: 10px;
          border-radius: 4px;
          border: 2px solid #ffffff;
        }
      \`}</style>
    </div>
  );
};

export default CoachCharacter;
