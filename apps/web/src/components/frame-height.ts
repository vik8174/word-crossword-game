/**
 * How tall the frame's header is, and how a screen subtracts it from the window.
 *
 * The frame is a column: the header across the top, then the screen in the rest
 * of the window (issue #245). Five places used to measure themselves against the
 * whole window (`100dvh`, a share of it, a box pinned to it), and each of them
 * now measures against what the header leaves. They all read the same thing
 * from here, so that none of them can disagree about how much that is.
 *
 * The header sets {@link FRAME_HEADER_HEIGHT_PROPERTY} on the document from its
 * own rendered, border-box height (`Frame.tsx`). Every read carries a fallback,
 * {@link FRAME_HEADER_FALLBACK}: a story drawn without the frame, a test in
 * jsdom, and the frame's first paint all lay out against the header's
 * `min-height` and not against an invalid value.
 */

/** The custom property the frame publishes its header's rendered height as. */
export const FRAME_HEADER_HEIGHT_PROPERTY = '--frame-header-height';

/** The header's `min-height`, and the height assumed wherever the frame is absent. */
export const FRAME_HEADER_FALLBACK = 64;

/** The header's height as a CSS length: the published value, or the fallback. */
export const FRAME_HEADER_HEIGHT = `var(${FRAME_HEADER_HEIGHT_PROPERTY}, ${FRAME_HEADER_FALLBACK}px)`;

/**
 * A length less the header, as a CSS value.
 *
 * @param length - What is taken from, such as `100dvh` or `78dvh`
 * @returns A `calc()` that is the length less the header's height
 *
 * @example
 * minHeight: belowFrame('100dvh')
 */
export const belowFrame = (length: string): string => `calc(${length} - ${FRAME_HEADER_HEIGHT})`;
