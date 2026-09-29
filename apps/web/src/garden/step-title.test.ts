import { describe, expect, it } from 'vitest';

import { STEP_TITLE_SIZE } from '../scale';
import { SCENE } from './scene-palette';
import { stepTitleSx } from './scene-surface';

/**
 * The name of a step is one drawing shared by `/create`, join, the lobby,
 * `finished` and `closed-early` (`design/templates/state-tree.html`'s
 * `.step-title`, issue #197), so what is pinned here is what that drawing
 * says: the size, and a rule that runs the full width of the title's own block
 * rather than off the edge of the window.
 */
describe('the name of a step', () => {
  const title = stepTitleSx();
  const rule = title['&::after'] as Record<string, unknown>;

  it('is set at the template size, on the page line', () => {
    expect(title.fontSize).toBe(`${STEP_TITLE_SIZE / 16}rem`);
    expect(title.lineHeight).toBe(1.6);
  });

  it('is a block, so the rule under it is as wide as the box it is put in', () => {
    expect(title.display).toBe('block');
    expect(rule.display).toBe('block');
    expect(rule.width).toBe('100%');
  });

  it("draws the temple's red as a 2px rule, and does not reach outside its own block", () => {
    expect(rule.height).toBe('2px');
    expect(rule.backgroundColor).toBe(SCENE.vermilion);
    expect(rule).not.toHaveProperty('left');
    expect(rule).not.toHaveProperty('right');
  });
});
