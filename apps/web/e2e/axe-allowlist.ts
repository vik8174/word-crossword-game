/**
 * The accessibility violations the end-to-end run accepts, one entry each.
 *
 * A `serious` or `critical` axe violation fails the run unless it is listed here
 * by rule id and page. Every entry carries its reason, and each is either a new
 * issue or accepted by name: the Architect approves them on #292.
 */
export interface AllowedViolation {
  /** The axe rule id, e.g. `color-contrast`. */
  readonly rule: string;
  /** The page it was found on: `home`, `create`, `lobby`, `game`, `finished` or `ended-early`. */
  readonly page: string;
  /** One line: why it is accepted, and where it is followed up. */
  readonly reason: string;
}

export const ALLOWED_VIOLATIONS: readonly AllowedViolation[] = [
  {
    rule: 'label-content-name-mismatch',
    page: 'game',
    reason:
      'The "You explain" word buttons carry an aria-label ("2 down, apple") that is not their visible text; found on the first run of #292, to be followed up.',
  },
  {
    rule: 'aria-prohibited-attr',
    page: 'ended-early',
    reason:
      'The closed board draws empty squares as div elements with an aria-label ("Row 3, column 5 - empty") and no role; found on the first run of #292, to be followed up.',
  },
];
