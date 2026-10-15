import { describe, expect, it } from 'vitest';

import { MOTION_MS, OUT_CURVE, SPRING_CURVE } from './motion';
import { MOTION_PLAY_CSS } from './motion-play-styles';
import { MOTION_CSS } from './motion-styles';

/** The only properties the street animates. */
const ANIMATED_PROPERTIES = new Set([
  'transform',
  'opacity',
  'clip-path',
  'background-color',
  'box-shadow',
  'stroke-dashoffset',
]);

/** Every rule that is not a keyframes block, as selector and declarations. */
const rulesOf = (css: string): Map<string, string> => {
  const inner = css.slice(css.indexOf('{') + 1, css.lastIndexOf('}'));
  const withoutFrames = inner.replace(/@keyframes [\w-]+\{(?:[^{}]*\{[^{}]*\})*\}/g, '');

  return new Map(
    [...withoutFrames.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => [
      selector ?? '',
      body ?? '',
    ]),
  );
};

/** Every keyframes block, by name, as its list of frames with their declarations. */
const keyframesOf = (css: string): Map<string, string> =>
  new Map(
    [...css.matchAll(/@keyframes ([\w-]+)\{((?:[^{}]*\{[^{}]*\})*)\}/g)].map(([, name, body]) => [
      name ?? '',
      body ?? '',
    ]),
  );

/** The two sheets together: what the app has once a room or the form is open. */
const ALL_CSS = `${MOTION_CSS}${MOTION_PLAY_CSS}`;

const rules = new Map([...rulesOf(MOTION_CSS), ...rulesOf(MOTION_PLAY_CSS)]);
const keyframes = new Map([...keyframesOf(MOTION_CSS), ...keyframesOf(MOTION_PLAY_CSS)]);

describe('motion rules', () => {
  it('are all inside no-preference, so with reduced motion the page is simply there', () => {
    for (const sheet of [MOTION_CSS, MOTION_PLAY_CSS]) {
      expect(sheet.startsWith('@media (prefers-reduced-motion:no-preference){')).toBe(true);
      expect(sheet.endsWith('}')).toBe(true);
      expect(sheet.match(/@media/g)).toHaveLength(1);
    }
  });

  it('animate only transform, opacity, clip-path, background-color, box-shadow and the line’s dash offset', () => {
    expect(keyframes.size).toBeGreaterThan(10);

    for (const [name, frames] of keyframes) {
      const properties = [...frames.matchAll(/([a-z-]+):/g)].map(([, property]) => property ?? '');

      expect(properties.length, name).toBeGreaterThan(0);

      for (const property of properties) {
        expect(ANIMATED_PROPERTIES, `${name} animates ${property}`).toContain(property);
      }
    }
  });

  it('use only keyframes that exist', () => {
    const used = [...ALL_CSS.matchAll(/animation:([^;}]*)/g)]
      .flatMap(([, value]) => (value ?? '').split(/,(?=\s*s-|\s*[a-z]+-)/))
      .map((one) => one.trim().split(' ')[0] ?? '');

    expect(used.length).toBeGreaterThan(10);

    for (const name of used) {
      expect(keyframes.has(name), `${name} is used and not defined`).toBe(true);
    }
  });

  it('use no curve but the two of the street and the keywords of the drawing', () => {
    const curves = [...ALL_CSS.matchAll(/cubic-bezier\([^)]*\)/g)].map(([curve]) => curve);

    expect(new Set(curves)).toEqual(new Set([OUT_CURVE, SPRING_CURVE]));
  });

  it('rise a page block in 620ms on --out, 120ms plus 70ms for each place', () => {
    expect(rules.get('.enter [data-rise],.enter [data-rise-children]>*')).toBe(
      `animation:s-rise ${MOTION_MS.rise}ms ${OUT_CURVE} both;animation-delay:calc(var(--i,0)*70ms+120ms)`,
    );
  });

  it('throw the fiesta only under the mark of a screen reached by playing', () => {
    const arriving = [...rules.keys()].filter((selector) => selector.includes('[data-fiesta'));

    expect(arriving.sort()).toEqual([
      '[data-fiesta=arrives] .fiesta',
      '[data-fiesta=arrives] .fiesta .flag',
      '[data-fiesta=arrives] svg .confetti',
      '[data-fiesta=arrives] svg .lantern',
    ]);
    // Standing already, the flags and the lanterns still sway; nothing else moves.
    expect(rules.get('.fiesta .flag')).toMatch(
      /^animation:s-sway 2400ms ease-in-out infinite alternate;/,
    );
    expect(rules.get('svg .lantern')).toMatch(
      /animation:s-sway 2600ms ease-in-out infinite alternate;/,
    );
    expect(rules.has('svg .confetti')).toBe(false);
  });

  it('keep the first visit to the rules of a screen opening: the room’s are fetched with the room', () => {
    expect(MOTION_CSS).toContain('s-rise');
    expect(MOTION_CSS).not.toMatch(/fiesta|lantern|\.dialog|\.cell|pegged|field-fault/);
    expect(MOTION_PLAY_CSS).toMatch(/fiesta[\s\S]*\.dialog|\.dialog[\s\S]*fiesta/);
  });

  it('let the veil go when it has finished, so MUI’s fade-out is not held open', () => {
    expect(rules.get('.modal-veil')).toBe('animation:s-veil 260ms ease-out backwards');
  });
});
