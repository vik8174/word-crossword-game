import { type ReactNode, useMemo, useState } from 'react';

import {
  type FrameSlotContent,
  type FrameSlotEntry,
  FrameSlotContentContext,
  type FrameSlotWriter,
  FrameSlotWriterContext,
} from './frame-slot';

/**
 * Holds what the screens have put in the frame's header.
 *
 * Mounted once, above both the frame and the routes (`App.tsx`), so the header
 * stays where it is while a screen is fetched (`Suspense`) or changes
 * (`ScreenEnter`) and the screens still reach it.
 *
 * The slot shows the most recently mounted filler. It has to be that and not
 * "the latest write", because a screen can be mounted before the one it
 * replaces is removed, and when the old one is finally removed, its removal
 * must take away its own entry and nothing of the arriving screen's. Entries are kept in the order they mounted;
 * a filler that changes its content is changed in place and does not move.
 *
 * @param props.children - The frame and the routes
 */
export const FrameSlotProvider = ({ children }: { readonly children: ReactNode }) => {
  const [entries, setEntries] = useState<readonly FrameSlotEntry[]>([]);

  const writer = useMemo<FrameSlotWriter>(
    () => ({
      put: (entry) =>
        setEntries((held) =>
          held.some(({ id }) => id === entry.id)
            ? held.map((kept) => (kept.id === entry.id ? entry : kept))
            : [...held, entry],
        ),
      remove: (id) => setEntries((held) => held.filter((kept) => kept.id !== id)),
    }),
    [],
  );

  const shown = entries.at(-1);
  const content = useMemo<FrameSlotContent>(
    () => ({
      status: shown?.status,
      action: shown?.action,
      plainWordmark: shown?.plainWordmark,
    }),
    [shown?.status, shown?.action, shown?.plainWordmark],
  );

  return (
    <FrameSlotWriterContext value={writer}>
      <FrameSlotContentContext value={content}>{children}</FrameSlotContentContext>
    </FrameSlotWriterContext>
  );
};
