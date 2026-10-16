import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { type RefObject, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { inRem } from '../scale';
import { STREET } from '../street';
import { FRAME_HEADER_FALLBACK, FRAME_HEADER_HEIGHT_PROPERTY } from './frame-height';
import { useFrameSlotContent } from './frame-slot';
import { FROM_TABLET, FROM_WIDE, STATUS_SX, WORDMARK_LINK_SX, WORDMARK_SX } from './frame-styles';
import { OUTLINE_WIDTH } from './surface-styles';

/**
 * Publishes the header's rendered height as `--frame-header-height` on the
 * document, for as long as the frame is mounted.
 *
 * What is measured is the header's border box, which is what the screen below
 * it has to leave room for: the content box would be 21.5px short of it
 * (padding and the hairline). It follows the header when an action wraps it
 * taller, and it measures one element of the app, not the window. Where there is
 * no `ResizeObserver` (jsdom) nothing is published, and every read of the
 * property falls back to the header's `min-height` (`frame-height.ts`).
 */
const usePublishedHeaderHeight = (header: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const element = header.current;

    if (element === null || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty(
        FRAME_HEADER_HEIGHT_PROPERTY,
        `${element.getBoundingClientRect().height}px`,
      );
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
      root.style.removeProperty(FRAME_HEADER_HEIGHT_PROPERTY);
    };
  }, [header]);
};

/**
 * The frame of the app: a header with the name across the top of every route,
 * and a slot for the status line and the one action of the screen below it.
 *
 * It is mounted once, in `App.tsx`, above `Suspense` and the routes, so it is
 * there while a page is fetched and does not move when a room shifts from one
 * screen to the next. A screen fills the slot with `useFrameSlot`. The header is
 * sticky, and `min-height` 64px; the screen below it takes the rest of the
 * window (`frame-height.ts`).
 *
 * The name is a link to the home page (a client-side navigation) on every
 * screen except those that set `plainWordmark` in the slot: the lobby, the game
 * and the home page, where a stray tap must not take a player out of a room.
 *
 * @example
 * <FrameSlotProvider>
 *   <Frame />
 *   <RoutedPages />
 * </FrameSlotProvider>
 */
export const Frame = () => {
  const { status, action, plainWordmark } = useFrameSlotContent();
  const header = useRef<HTMLElement>(null);

  usePublishedHeaderHeight(header);

  return (
    <Box
      component="header"
      ref={header}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: inRem(20),
        minHeight: `${FRAME_HEADER_FALLBACK}px`,
        padding: `${inRem(10)} ${inRem(18)}`,
        backgroundColor: STREET.duck,
        borderBottom: `${OUTLINE_WIDTH}px solid ${STREET.line}`,
        [FROM_TABLET]: { paddingInline: inRem(32) },
        [FROM_WIDE]: { paddingInline: inRem(48) },
      }}
    >
      {plainWordmark === true ? (
        <Typography component="span" sx={WORDMARK_SX}>
          Across the Street
        </Typography>
      ) : (
        <Typography component={RouterLink} to="/" sx={{ ...WORDMARK_SX, ...WORDMARK_LINK_SX }}>
          Across the Street
        </Typography>
      )}
      {status === undefined ? null : (
        <Typography variant="hint" component="div" sx={STATUS_SX}>
          {status}
        </Typography>
      )}
      {/* Always there, empty or not, as the template's `.action` is: the gap
          either side of the status line is then the same whether or not the
          screen has an action, and the status stays centred between the
          wordmark and the edge of the header. */}
      <Box sx={{ flex: 'none', marginInlineStart: 'auto' }}>{action}</Box>
    </Box>
  );
};
