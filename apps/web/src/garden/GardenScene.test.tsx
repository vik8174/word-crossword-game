import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REDUCED_MOTION_QUERY } from '../components/screen-shift';
import { GardenScene } from './GardenScene';
import { SCENE_FADE_MS } from './scene-transition';

/**
 * Answers the reduced-motion query the way the system setting would.
 *
 * jsdom has no `matchMedia` at all, and a browser without one is read as
 * somebody who has not turned animation off — which is the ordinary case, so
 * only this one is stubbed.
 */
const turnAnimationOff = () => {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: query === REDUCED_MOTION_QUERY,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
};

/** Every picture layer on the page right now, in DOM order. */
const pictureLayers = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-scene-role]'));

/** The one picture layer standing for a given role, or `null`. */
const layerWithRole = (container: HTMLElement, role: string) =>
  container.querySelector<HTMLElement>(`[data-scene-role="${role}"]`);

/** The bloom-and-sun overlay's two elements, or an empty list when it is not on the page. */
const sceneLightElements = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[aria-hidden="true"]')).filter(
    (el) => !el.hasAttribute('data-scene-role') && el.parentElement?.hasAttribute('aria-hidden'),
  );

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('GardenScene', () => {
  it('draws nothing before anything has said which picture it wants', () => {
    const { container } = render(<GardenScene scene={null} />);

    expect(pictureLayers(container)).toHaveLength(0);
  });

  it('shows the first picture at once, settled, with no fade and no light', () => {
    const { container } = render(<GardenScene scene="gate" />);

    const layers = pictureLayers(container);

    expect(layers).toHaveLength(1);
    expect(layers[0]?.dataset.sceneRole).toBe('settled');
    expect(sceneLightElements(container)).toHaveLength(0);
  });

  it('fires nothing for a second screen of the same picture', () => {
    const { container, rerender } = render(<GardenScene scene="gate" />);
    const before = layerWithRole(container, 'settled');

    // The same picture, asked for again — the case two screens standing on
    // one picture (`create`, `create/errors`) actually produce. Nothing about
    // the tree may change: no leaving layer, no light, and the settled layer
    // is not even rebuilt.
    rerender(<GardenScene scene="gate" />);

    expect(pictureLayers(container)).toHaveLength(1);
    expect(layerWithRole(container, 'leaving')).toBeNull();
    expect(sceneLightElements(container)).toHaveLength(0);
    expect(layerWithRole(container, 'settled')).toBe(before);
  });

  it('crossfades into a real change of scene, with the bloom and the sun over it', () => {
    const { container, rerender } = render(<GardenScene scene="gate" />);

    rerender(<GardenScene scene="doors" />);

    // Both on the page at once, which is what makes this a crossfade rather
    // than a swap: the picture that was is still there, on its way out, under
    // the one arriving.
    const leaving = layerWithRole(container, 'leaving');
    const arriving = layerWithRole(container, 'arriving');

    expect(leaving).not.toBeNull();
    expect(arriving).not.toBeNull();
    expect(sceneLightElements(container)).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(SCENE_FADE_MS);
    });

    // The fade is over: the outgoing picture and the light are taken off the
    // page, and the picture that arrived is now simply the one being shown.
    expect(layerWithRole(container, 'leaving')).toBeNull();
    expect(sceneLightElements(container)).toHaveLength(0);
    expect(layerWithRole(container, 'settled')).toBe(arriving);
  });

  it('keeps the outgoing picture as the same element, rather than rebuilding it', () => {
    const { container, rerender } = render(<GardenScene scene="gate" />);
    const gate = layerWithRole(container, 'settled');

    rerender(<GardenScene scene="doors" />);

    // The picture that was current a moment ago is now leaving, and it is the
    // very same element — its own 26-second push must not restart just
    // because a crossfade started over it.
    expect(layerWithRole(container, 'leaving')).toBe(gate);
  });

  it('replays the bloom and the sun for "Back to the gate", run twice in a session', () => {
    const { container, rerender } = render(<GardenScene scene="gate" />);

    rerender(<GardenScene scene="doors" />);
    const firstLight = sceneLightElements(container);

    act(() => {
      vi.advanceTimersByTime(SCENE_FADE_MS);
    });

    rerender(<GardenScene scene="hall" />);

    act(() => {
      vi.advanceTimersByTime(SCENE_FADE_MS);
    });

    // Back to the gate: the same transition, run a second time in the same
    // session, onto a picture this component has already shown once before.
    rerender(<GardenScene scene="gate" />);
    const secondLight = sceneLightElements(container);

    expect(secondLight).toHaveLength(2);
    // A fresh instance rather than the first one merely toggled back on —
    // otherwise the animation it carries would already have run to its end
    // and would not play again.
    expect(secondLight[0]).not.toBe(firstLight[0]);
    expect(secondLight[1]).not.toBe(firstLight[1]);

    const gateAgain = layerWithRole(container, 'arriving');

    expect(gateAgain).not.toBeNull();
    expect(gateAgain?.dataset.sceneRole).toBe('arriving');
  });

  it('changes the picture at once for somebody who turned animation off, with no push', () => {
    turnAnimationOff();

    const { container, rerender } = render(<GardenScene scene="gate" />);

    expect(
      layerWithRole(container, 'settled')
        ?.querySelector('[data-pushed]')
        ?.getAttribute('data-pushed'),
    ).toBe('false');

    rerender(<GardenScene scene="doors" />);

    // Off rather than slower: there was never a leaving layer to wait for,
    // and no light ever mounted.
    expect(layerWithRole(container, 'leaving')).toBeNull();
    expect(sceneLightElements(container)).toHaveLength(0);
    expect(pictureLayers(container)).toHaveLength(1);
    expect(layerWithRole(container, 'settled')?.dataset.sceneRole).toBe('settled');
  });
});
