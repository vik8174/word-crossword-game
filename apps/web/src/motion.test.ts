import { describe, expect, it } from 'vitest';

import {
  ENTER_MS,
  MOTION_DURATIONS_MS,
  MOTION_EASING,
  MOTION_MS,
  OUT_CURVE,
  SPRING_CURVE,
} from './motion';

describe('motion', () => {
  it('is a row of two durations for MUI, quicker than slower, and no others', () => {
    expect(Object.keys(MOTION_DURATIONS_MS)).toEqual(['quick', 'settle']);
    expect(MOTION_DURATIONS_MS.quick).toBeLessThan(MOTION_DURATIONS_MS.settle);
  });

  it('has two curves, both real ones, and MUI is given the first', () => {
    expect(OUT_CURVE).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(SPRING_CURVE).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
    expect(MOTION_EASING).toBe(OUT_CURVE);
  });

  it('holds the table of the drawing, number for number', () => {
    // The motion block of design/templates/state-tree.html, lines 319-359.
    expect(MOTION_MS).toMatchObject({
      rise: 620,
      riseDelay: 120,
      riseStep: 70,
      shutters: 900,
      lean: 700,
      leanDelay: 420,
      line: 1000,
      lineDelay: 700,
      cards: 500,
      cardsDelay: 1250,
      turn: 560,
      turnStep: 80,
      peg: 1100,
      pegDelay: 420,
      shake: 420,
      message: 520,
      dialog: 460,
      dialogDelay: 60,
      veil: 260,
      fault: 420,
      fiestaCard: 760,
      fiestaCardDelay: 200,
      flagDrop: 640,
      flagDropDelay: 400,
      flagStep: 70,
      flagSway: 2400,
      flagSwayDelay: 1040,
      lanternDrop: 760,
      lanternDropDelay: 300,
      lanternStep: 80,
      lanternSway: 2600,
      lanternSwayDelay: 1060,
      confetti: 1800,
      confettiDelay: 500,
      confettiStep: 45,
      lift: 160,
      press: 60,
      tone: 220,
      row: 200,
    });
  });

  it('keeps a screen entering until its last movement has finished', () => {
    expect(ENTER_MS).toBeGreaterThan(MOTION_MS.cardsDelay + MOTION_MS.cards);
  });
});
