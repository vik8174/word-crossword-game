import { render, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Street } from './Street';

const LABEL = 'A street, as the screen words it';

const svgOf = (container: HTMLElement): SVGSVGElement => {
  const svg = container.querySelector('svg');
  if (!svg) {
    throw new Error('Street drew no svg');
  }
  return svg;
};

describe('Street: what it is', () => {
  it('is one picture, named by the label exactly as given', () => {
    render(<Street label="Both balconies taken" teacher="here" />);

    expect(screen.getByRole('img', { name: 'Both balconies taken' })).toBeInTheDocument();
  });

  it('draws no script, no foreignObject, no link and nothing a keyboard can reach', () => {
    const { container } = render(
      <Street
        label={LABEL}
        teacher="here"
        fiesta
        letters="radio"
        cards={['bread', 'apple']}
        justAnswered="apple"
      />,
    );
    const svg = svgOf(container);

    expect(svg.querySelectorAll('script, foreignObject, a, button, input, image')).toHaveLength(0);
    expect(svg.querySelectorAll('[href], [xlink\\:href], [tabindex]')).toHaveLength(0);
  });

  it('shows as much of the street as the crop says', () => {
    const viewBox = (crop?: 'full' | 'top' | 'band') =>
      svgOf(render(<Street label={LABEL} crop={crop} />).container).getAttribute('viewBox');

    expect(viewBox()).toBe('0 30 640 490');
    expect(viewBox('full')).toBe('0 30 640 490');
    expect(viewBox('top')).toBe('0 40 640 312');
    expect(viewBox('band')).toBe('0 130 640 226');
  });
});

describe('Street: who is on the balconies', () => {
  const people = (props: Parameters<typeof Street>[0]) =>
    svgOf(render(<Street {...props} />).container).querySelectorAll('.who').length;

  it('puts a neighbour on each balcony, and nobody at the end of the street in a pair game', () => {
    expect(people({ label: LABEL })).toBe(2);
  });

  it('leaves the right balcony empty unless that neighbour is here', () => {
    expect(people({ label: LABEL, right: 'empty' })).toBe(1);
    expect(people({ label: LABEL, right: 'away' })).toBe(1);
    expect(people({ label: LABEL, right: 'shut' })).toBe(1);
  });

  it('puts the teacher at the end of the street only when she is here', () => {
    expect(people({ label: LABEL, teacher: 'here' })).toBe(3);
    expect(people({ label: LABEL, teacher: 'away' })).toBe(2);
  });
});

describe('Street: the line', () => {
  const dashed = (props: Parameters<typeof Street>[0]) =>
    svgOf(render(<Street {...props} />).container).querySelectorAll('[stroke-dasharray]').length;

  it('draws the taut and the slack line as a path to animate, and the loose one without', () => {
    const lineDraw = (line: 'taut' | 'slack' | 'loose' | 'none') =>
      svgOf(render(<Street label={LABEL} line={line} />).container).querySelectorAll('.line-draw')
        .length;

    expect(lineDraw('taut')).toBe(1);
    expect(lineDraw('slack')).toBe(1);
    expect(lineDraw('loose')).toBe(0);
    expect(lineDraw('none')).toBe(0);
  });

  it('dashes a loose line only while it is being thrown', () => {
    expect(dashed({ label: LABEL, line: 'loose', thrown: true })).toBe(1);
    expect(dashed({ label: LABEL, line: 'loose' })).toBe(0);
    expect(dashed({ label: LABEL, line: 'taut' })).toBe(0);
  });

  it('sags a slack line and the cards on it, and no other', () => {
    const cardY = (line: 'taut' | 'slack') =>
      svgOf(render(<Street label={LABEL} line={line} cards={['bread']} />).container)
        .querySelector('.card')
        ?.getAttribute('transform');

    expect(cardY('taut')).toBe('translate(320.0 264.5) rotate(-3)');
    expect(cardY('slack')).toBe('translate(320.0 288.5) rotate(-3)');
  });
});

describe('Street: the words on the line', () => {
  const cards = (words: string[], justAnswered?: string) =>
    svgOf(
      render(<Street label={LABEL} crop="band" cards={words} justAnswered={justAnswered} />)
        .container,
    );

  it('hangs the words in the order given', () => {
    const texts = [...cards(['bread', 'engine', 'cheese']).querySelectorAll('.card text')].map(
      (text) => text.textContent,
    );

    expect(texts).toEqual(['bread', 'engine', 'cheese']);
  });

  it('marks the word just answered, and only that one, for #230', () => {
    const svg = cards(['bread', 'apple'], 'apple');
    const pegged = [...svg.querySelectorAll('.pegged')];

    expect(pegged).toHaveLength(1);
    expect(pegged[0]?.textContent).toBe('apple');
  });

  it('marks nothing when no word is the one just answered', () => {
    expect(cards(['bread', 'apple']).querySelectorAll('.pegged')).toHaveLength(0);
    expect(cards(['bread'], 'apple').querySelectorAll('.pegged')).toHaveLength(0);
  });

  it('draws a word as a tile for each of its letters', () => {
    const svg = svgOf(render(<Street label={LABEL} letters="radio" />).container);
    const letters = [...svg.querySelectorAll('.card text')].map((text) => text.textContent);

    expect(letters).toEqual(['r', 'a', 'd', 'i', 'o']);
  });

  it('sets the cards in Alegreya Sans, by family name', () => {
    const text = cards(['bread']).querySelector('.card text');

    expect(text?.getAttribute('font-family')).toContain('Alegreya Sans');
  });
});

/**
 * The pieces of confetti the template's seeded formula keeps of its 28 (lines
 * 593-594), counted by running that formula on its own.
 */
const CONFETTI_PIECES = 25;

describe('Street: the fiesta', () => {
  const fiesta = () =>
    svgOf(render(<Street label={LABEL} crop="band" mood="cheer" fiesta />).container);

  it('hangs two strings of seven lanterns, each indexed for #230', () => {
    const lanterns = [...fiesta().querySelectorAll<SVGGElement>('.lantern')];

    expect(lanterns.map((lantern) => lantern.style.getPropertyValue('--k'))).toEqual([
      ...Array.from({ length: 7 }, (_, i) => String(i + 1)),
      ...Array.from({ length: 7 }, (_, i) => String(i + 8)),
    ]);
  });

  it('scatters confetti by the template seeded formula, each piece indexed for #230', () => {
    const confetti = [...fiesta().querySelectorAll<SVGGElement>('.confetti')];
    const indexes = confetti.map((piece) => Number(piece.style.getPropertyValue('--k')));

    expect(confetti).toHaveLength(CONFETTI_PIECES);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it('draws neither lanterns nor confetti for a game still being played', () => {
    const { container } = render(<Street label={LABEL} />);

    expect(container.querySelectorAll('.lantern, .confetti')).toHaveLength(0);
  });
});

describe('Street: the motion hooks #230 needs', () => {
  it('keeps the template class names on the elements the template puts them on', () => {
    const svg = svgOf(render(<Street label={LABEL} teacher="here" cards={['bread']} />).container);

    // the two open windows of the two houses, a pair on each
    expect(svg.querySelectorAll('.shutter.sl')).toHaveLength(2);
    expect(svg.querySelectorAll('.shutter.sr')).toHaveLength(2);
    expect(svg.querySelectorAll('.who')).toHaveLength(3);
    expect(svg.querySelectorAll('.line-draw')).toHaveLength(1);
    expect(svg.querySelectorAll('.card')).toHaveLength(1);
  });

  it('draws no animation of its own', () => {
    const { container } = render(<Street label={LABEL} fiesta cards={['bread']} />);

    expect(
      container.querySelectorAll('animate, animateTransform, animateMotion, set, style'),
    ).toHaveLength(0);
  });
});

describe('Street: its colours', () => {
  const DIRECTORY = __dirname;
  const read = (name: string) => readFileSync(resolve(DIRECTORY, name), 'utf8');
  const drawingFiles = readdirSync(DIRECTORY).filter(
    (name) => /^street-.*\.tsx?$/.test(name) || name === 'Street.tsx',
  );

  it('names a hex value nowhere but in the drawing palette', () => {
    const offenders = drawingFiles
      .filter((name) => name !== 'street-drawing-palette.ts')
      .filter((name) => /['"`]#[0-9a-fA-F]{3,8}['"`]/.test(read(name)));

    expect(drawingFiles).toContain('street-drawing-palette.ts');
    expect(offenders).toEqual([]);
  });

  it('gives the drawing palette the ten colours the template names, and three skin and hair tones', () => {
    const palette = read('street-drawing-palette.ts');

    expect(palette.match(/#[0-9A-Fa-f]{6}/g)).toHaveLength(16);
  });
});
