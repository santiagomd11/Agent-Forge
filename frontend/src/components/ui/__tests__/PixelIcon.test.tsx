import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  PixelAnvil, PixelRobot, PixelPlay, PixelCheck, PixelClock,
  PixelX, PixelGear, PixelTerminal, PixelSun, PixelMoon,
  PixelList, PixelArrow, PixelBack, PixelStep,
} from '../PixelIcon';

const icons = [
  { name: 'PixelAnvil', Component: PixelAnvil },
  { name: 'PixelRobot', Component: PixelRobot },
  { name: 'PixelPlay', Component: PixelPlay },
  { name: 'PixelCheck', Component: PixelCheck },
  { name: 'PixelClock', Component: PixelClock },
  { name: 'PixelX', Component: PixelX },
  { name: 'PixelGear', Component: PixelGear },
  { name: 'PixelTerminal', Component: PixelTerminal },
  { name: 'PixelSun', Component: PixelSun },
  { name: 'PixelMoon', Component: PixelMoon },
  { name: 'PixelList', Component: PixelList },
  { name: 'PixelArrow', Component: PixelArrow },
  { name: 'PixelBack', Component: PixelBack },
  { name: 'PixelStep', Component: PixelStep },
];

describe('PixelIcons', () => {
  icons.forEach(({ name, Component }) => {
    it(`${name} renders an SVG`, () => {
      const { container } = render(<Component />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  it('applies custom size', () => {
    const { container } = render(<PixelAnvil size={32} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('32');
    expect(svg.getAttribute('height')).toBe('32');
  });

  it('applies custom color', () => {
    const { container } = render(<PixelPlay color="red" />);
    const rect = container.querySelector('rect');
    expect(rect?.getAttribute('fill')).toBe('red');
  });

  it('has pixel-icon class', () => {
    const { container } = render(<PixelCheck />);
    const svg = container.querySelector('svg')!;
    expect(svg.classList.contains('pixel-icon')).toBe(true);
  });

  it('applies custom className', () => {
    const { container } = render(<PixelX className="my-class" />);
    const svg = container.querySelector('svg')!;
    expect(svg.classList.contains('my-class')).toBe(true);
  });
});
