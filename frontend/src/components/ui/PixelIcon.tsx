const px = 'pixelated' as const;

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

interface IconWithHoleProps extends IconProps {
  hole?: string;
}

export function PixelAnvil({ size = 20, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="2" y="2" width="12" height="2" fill={color} /><rect x="1" y="4" width="14" height="2" fill={color} />
      <rect x="4" y="6" width="8" height="2" fill={color} /><rect x="5" y="8" width="6" height="2" fill={color} />
      <rect x="3" y="10" width="10" height="2" fill={color} /><rect x="2" y="12" width="12" height="2" fill={color} />
    </svg>
  );
}

export function PixelRobot({ size = 24, color = 'currentColor', hole = '#141413', className = '' }: IconWithHoleProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="7" y="0" width="2" height="2" fill={color} /><rect x="4" y="2" width="8" height="2" fill={color} />
      <rect x="3" y="4" width="10" height="6" fill={color} /><rect x="5" y="5" width="2" height="2" fill={hole} />
      <rect x="9" y="5" width="2" height="2" fill={hole} /><rect x="6" y="8" width="4" height="1" fill={hole} />
      <rect x="2" y="6" width="1" height="3" fill={color} /><rect x="13" y="6" width="1" height="3" fill={color} />
      <rect x="5" y="10" width="2" height="2" fill={color} /><rect x="9" y="10" width="2" height="2" fill={color} />
      <rect x="4" y="12" width="3" height="2" fill={color} /><rect x="9" y="12" width="3" height="2" fill={color} />
    </svg>
  );
}

export function PixelPlay({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="4" y="2" width="2" height="12" fill={color} /><rect x="6" y="3" width="2" height="10" fill={color} />
      <rect x="8" y="4" width="2" height="8" fill={color} /><rect x="10" y="5" width="2" height="6" fill={color} />
      <rect x="12" y="6" width="2" height="4" fill={color} />
    </svg>
  );
}

export function PixelCheck({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="12" y="2" width="2" height="2" fill={color} /><rect x="10" y="4" width="2" height="2" fill={color} />
      <rect x="8" y="6" width="2" height="2" fill={color} /><rect x="6" y="8" width="2" height="2" fill={color} />
      <rect x="4" y="10" width="2" height="2" fill={color} /><rect x="2" y="8" width="2" height="2" fill={color} />
    </svg>
  );
}

export function PixelClock({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="5" y="1" width="6" height="2" fill={color} /><rect x="3" y="3" width="2" height="2" fill={color} />
      <rect x="11" y="3" width="2" height="2" fill={color} /><rect x="1" y="5" width="2" height="6" fill={color} />
      <rect x="13" y="5" width="2" height="6" fill={color} /><rect x="3" y="11" width="2" height="2" fill={color} />
      <rect x="11" y="11" width="2" height="2" fill={color} /><rect x="5" y="13" width="6" height="2" fill={color} />
      <rect x="7" y="4" width="2" height="4" fill={color} /><rect x="9" y="7" width="2" height="2" fill={color} />
    </svg>
  );
}

export function PixelX({ size = 24, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="2" y="2" width="2" height="2" fill={color} /><rect x="12" y="2" width="2" height="2" fill={color} />
      <rect x="4" y="4" width="2" height="2" fill={color} /><rect x="10" y="4" width="2" height="2" fill={color} />
      <rect x="6" y="6" width="4" height="4" fill={color} />
      <rect x="4" y="10" width="2" height="2" fill={color} /><rect x="10" y="10" width="2" height="2" fill={color} />
      <rect x="2" y="12" width="2" height="2" fill={color} /><rect x="12" y="12" width="2" height="2" fill={color} />
    </svg>
  );
}

export function PixelGear({ size = 16, color = 'currentColor', hole = '#1E1D1B', className = '' }: IconWithHoleProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="6" y="0" width="4" height="2" fill={color} /><rect x="6" y="14" width="4" height="2" fill={color} />
      <rect x="0" y="6" width="2" height="4" fill={color} /><rect x="14" y="6" width="2" height="4" fill={color} />
      <rect x="4" y="2" width="8" height="2" fill={color} /><rect x="4" y="12" width="8" height="2" fill={color} />
      <rect x="2" y="4" width="2" height="8" fill={color} /><rect x="12" y="4" width="2" height="8" fill={color} />
      <rect x="4" y="4" width="8" height="8" fill={color} /><rect x="6" y="6" width="4" height="4" fill={hole} />
    </svg>
  );
}

export function PixelTerminal({ size = 16, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="1" y="1" width="14" height="2" fill={color} /><rect x="1" y="1" width="2" height="14" fill={color} />
      <rect x="13" y="1" width="2" height="14" fill={color} /><rect x="1" y="13" width="14" height="2" fill={color} />
      <rect x="4" y="6" width="2" height="2" fill={color} /><rect x="6" y="8" width="2" height="2" fill={color} />
      <rect x="4" y="10" width="2" height="2" fill={color} /><rect x="9" y="10" width="4" height="2" fill={color} />
    </svg>
  );
}

export function PixelSun({ size = 18, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="7" y="0" width="2" height="2" fill={color} /><rect x="7" y="14" width="2" height="2" fill={color} />
      <rect x="0" y="7" width="2" height="2" fill={color} /><rect x="14" y="7" width="2" height="2" fill={color} />
      <rect x="3" y="3" width="2" height="2" fill={color} /><rect x="11" y="3" width="2" height="2" fill={color} />
      <rect x="3" y="11" width="2" height="2" fill={color} /><rect x="11" y="11" width="2" height="2" fill={color} />
      <rect x="5" y="5" width="6" height="6" fill={color} />
    </svg>
  );
}

export function PixelMoon({ size = 18, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="6" y="1" width="4" height="2" fill={color} /><rect x="4" y="3" width="2" height="2" fill={color} />
      <rect x="3" y="5" width="2" height="6" fill={color} /><rect x="4" y="11" width="2" height="2" fill={color} />
      <rect x="6" y="13" width="4" height="2" fill={color} /><rect x="10" y="11" width="2" height="2" fill={color} />
      <rect x="11" y="7" width="2" height="4" fill={color} /><rect x="10" y="3" width="2" height="2" fill={color} />
      <rect x="8" y="5" width="2" height="2" fill={color} />
    </svg>
  );
}

export function PixelList({ size = 16, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: px }} className={`pixel-icon pixel-bounce ${className}`}>
      <rect x="1" y="2" width="2" height="2" fill={color} /><rect x="5" y="2" width="10" height="2" fill={color} />
      <rect x="1" y="7" width="2" height="2" fill={color} /><rect x="5" y="7" width="10" height="2" fill={color} />
      <rect x="1" y="12" width="2" height="2" fill={color} /><rect x="5" y="12" width="10" height="2" fill={color} />
    </svg>
  );
}

export function PixelArrow({ size = 12, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ imageRendering: px }} className={`pixel-icon ${className}`}>
      <rect x="2" y="5" width="8" height="2" fill={color} />
      <rect x="6" y="3" width="2" height="2" fill={color} /><rect x="8" y="5" width="2" height="2" fill={color} />
      <rect x="6" y="7" width="2" height="2" fill={color} />
    </svg>
  );
}

export function PixelBack({ size = 12, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ imageRendering: px, transform: 'scaleX(-1)' }} className={`pixel-icon ${className}`}>
      <rect x="2" y="5" width="8" height="2" fill={color} />
      <rect x="6" y="3" width="2" height="2" fill={color} /><rect x="8" y="5" width="2" height="2" fill={color} />
      <rect x="6" y="7" width="2" height="2" fill={color} />
    </svg>
  );
}

export function PixelStep({ size = 12, color = 'currentColor', className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" style={{ imageRendering: px }} className={`pixel-icon ${className}`}>
      <rect x="1" y="1" width="4" height="4" fill={color} opacity="0.4" />
      <rect x="7" y="1" width="4" height="4" fill={color} opacity="0.6" />
      <rect x="1" y="7" width="4" height="4" fill={color} opacity="0.8" />
      <rect x="7" y="7" width="4" height="4" fill={color} />
    </svg>
  );
}
