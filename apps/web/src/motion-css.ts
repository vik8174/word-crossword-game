/**
 * The three small helpers the movement style sheets are written with, and the
 * wrapper that puts a sheet inside the one setting that allows movement.
 */

/** `${n}ms`. */
export const ms = (value: number): string => `${value}ms`;

/**
 * `--name` times a step, plus a base, as the delay of the n-th element of a
 * sequence. The spaces round the `+` are part of the syntax: without them the
 * whole delay is invalid and is dropped.
 */
export const at = (name: string, step: number, base: number): string =>
  `calc(var(${name},0)*${ms(step)} + ${ms(base)})`;

/**
 * Wraps rules in the one setting that allows movement and takes the line breaks
 * out.
 */
export const noPreference = (rules: readonly string[]): string =>
  `@media (prefers-reduced-motion:no-preference){${rules.join('')}}`;
