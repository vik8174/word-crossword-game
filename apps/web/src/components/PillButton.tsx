import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ElementType, ReactNode } from 'react';

import { buttonSx, dotSx, LOADING_DOT_CLASS, type ButtonKind } from './button-styles';

export interface PillButtonProps {
  /** `primary`, the temple's own red, or `quiet`, standing directly on the picture. */
  readonly kind?: ButtonKind;
  /**
   * The `danger` modifier — meaningful on a `quiet` button only
   * (`design/templates/state-tree.html`'s `.btn.danger` is always paired with
   * `.btn.quiet` in the app, `EndGamePanel.tsx`'s "End the game"), so it is a
   * flag on this button rather than a third `kind`.
   */
  readonly danger?: boolean;
  /** The small pill — `.btn.sm` — `RoomInvitePanel.tsx`'s one use of it. */
  readonly small?: boolean;
  /**
   * Busy: the sun dot pulses, the surface turns to the loading fill regardless
   * of `kind`, and the pointer becomes `progress`. A button loading is also a
   * button that cannot be pressed twice, so this sets the native `disabled`
   * attribute the same way the `disabled` prop does — the two are kept apart
   * because they read differently (a hollow dot and no shadow versus a
   * beating one), not because only one of them should stop a press.
   */
  readonly loading?: boolean;
  readonly disabled?: boolean;
  /** `submit` for the two forms this control appears in; `button` otherwise. */
  readonly type?: 'button' | 'submit';
  readonly onClick?: () => void;
  /**
   * What to render as — `RouterLink` for the four buttons that navigate
   * rather than act. None of those carry `disabled` or `loading` in this app,
   * so neither prop is given an unlinked-anchor behaviour to fall back on.
   */
  readonly component?: ElementType;
  /** The address to navigate to, when `component` is a link. */
  readonly to?: string;
  readonly sx?: SxProps<Theme>;
  readonly children: ReactNode;
}

/**
 * The template's one button — `.btn` in `design/templates/state-tree.html`,
 * replacing MUI's `Button` everywhere in this app but `garden/RewardCloth.tsx`
 * and the two dialog buttons in `components/EndGamePanel.tsx` (issue #184,
 * "Where it goes" and "Not this issue's").
 *
 * Named `PillButton` rather than the plainer `Button` a caller might expect
 * (`Message.tsx`'s own precedent, one component named straight after its
 * template concept): this file and MUI's own button component are imported
 * side by side in `EndGamePanel.tsx`, and issue #184's own acceptance
 * criterion greps the source for the JSX opening tag of MUI's component to
 * prove nothing but `RewardCloth.tsx` and that file's two dialog buttons
 * still render it. Two components sharing one tag name would satisfy that
 * grep by accident, whichever module a given tag in the file happened to
 * import from — a plain text search cannot follow an import. `PillButton` is
 * not a random substitute; it is the template's own word for this control, in
 * the comment directly above `.btn` in `design/templates/state-tree.html`:
 * "the prototype's pill, unchanged in size, lettering, edge and dot".
 *
 * Not built on MUI's `Button`: that control brings a ripple, a `min-width` and
 * a focus background the template does not have, and disabling each of them
 * one at a time was more code than a plain, styled element. What is kept is
 * the part MUI's `ButtonBase` would have given for free and this component
 * still needs — `:focus-visible`, a native `disabled` attribute, and the
 * `component` prop for the four call sites that navigate rather than act.
 *
 * The sun dot is a real `<span>`, aria-hidden, not a pseudo-element: only a
 * real element can be named out of `theme.ts`'s reduced-motion freeze by
 * class, and `design/templates/state-tree.html` line 738 keeps this one
 * beating on purpose while every other animation and transition in the app
 * stops.
 *
 * @param props.kind - `primary` (the default) or `quiet`
 * @param props.danger - The `danger` modifier, meaningful on `quiet` only
 * @param props.small - The small pill
 * @param props.loading - Busy: the dot beats, the button cannot be pressed again
 * @param props.disabled - Cannot be pressed, and says nothing about why
 * @param props.component - What to render as; `RouterLink` for a navigating button
 *
 * @example
 * <PillButton kind="quiet" danger loading={isEnding}>
 *   {isEnding ? 'Ending the game...' : 'End the game'}
 * </PillButton>
 */
export const PillButton = ({
  kind = 'primary',
  danger = false,
  small = false,
  loading = false,
  disabled = false,
  type = 'button',
  component,
  sx,
  children,
  ...rest
}: PillButtonProps) => {
  const Component = component ?? 'button';
  const isNativeButton = Component === 'button';
  const state = { kind, danger, small, loading, disabled };

  return (
    <Box
      component={Component}
      type={isNativeButton ? type : undefined}
      disabled={isNativeButton ? disabled || loading : undefined}
      aria-disabled={!isNativeButton && (disabled || loading) ? true : undefined}
      sx={[buttonSx(state), ...(Array.isArray(sx) ? sx : [sx])]}
      {...rest}
    >
      <Box component="span" aria-hidden className={LOADING_DOT_CLASS} sx={dotSx(state)} />
      {children}
    </Box>
  );
};
