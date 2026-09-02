/**
 * The row this interface moves on, and the one place any of it is written
 * down.
 *
 * `scale.ts` has a row for size and a row for space; this app had none for
 * time. `theme.ts` never mentioned `transitions`, so a button, a field and the
 * one dialog in the app were each moving on whatever MUI happens to ship —
 * four different curves and seven different durations nobody had chosen,
 * standing next to the deliberate, measured motion of the camera and the
 * screen shift (`docs/decisions/0030-where-movement-is-allowed.md`).
 *
 * Two durations rather than MUI's seven, because the interface only ever asks
 * two questions of a control: does it change in place (a button darkening, a
 * label lifting off a field), or does a whole surface arrive and leave (the
 * one dialog in the app). A third slot bought no third question.
 *
 * One curve rather than MUI's four (`easeInOut`, `easeOut`, `easeIn`,
 * `sharp`), applied on the way in and the way out alike: this is chrome
 * moving, not a scene settling, and a control that darkens the same way it
 * lightens reads as one thing rather than as two habits sewn together.
 *
 * The camera, the screen shift, the garden's canvases and the page spinner
 * are not on this row and are not folded onto it. Each already carries its
 * own measured number, decided and tested on its own terms
 * (`garden/camera.ts`, `components/screen-shift.ts`, `garden/canvas-layer.ts`,
 * `garden/cloth.ts`, `pages/PageLoading.tsx`) — moving one of those numbers
 * onto a shared row would let a change meant for a button move the camera
 * with it. This ticket is about the motion nobody had chosen, not about the
 * motion that was already chosen carefully.
 */

/** How long a control takes to change in place: a button darkening, a field's label lifting. */
const QUICK_MS = 150;

/** How long a surface takes to arrive or leave: the one dialog in the app. */
const SETTLE_MS = 250;

/**
 * The two durations on the row, and there are no others.
 *
 * Handed to `theme.transitions.duration` in `theme.ts`, which is the one
 * place MUI's seven-slot duration object is built — every slot points at one
 * of these two numbers rather than at a value of its own.
 */
export const MOTION_DURATIONS_MS = { quick: QUICK_MS, settle: SETTLE_MS } as const;

/**
 * The one curve every motion on the row is drawn with, in and out alike.
 *
 * MUI's own `easeInOut`: gentle at both ends, so a control that changes in
 * place and a surface that arrives or leaves are drawn with the same hand
 * rather than each carrying a curve of its own.
 */
export const MOTION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
