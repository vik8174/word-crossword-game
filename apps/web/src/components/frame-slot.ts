import { createContext, type ReactNode, useContext, useEffect, useId } from 'react';

/** What a screen puts in the frame's header: a line about itself, and one control. */
export interface FrameSlotContent {
  /** The screen's status line. Shown from 768 up and not on a phone. */
  readonly status?: ReactNode;
  /** The screen's one action, always shown. */
  readonly action?: ReactNode;
  /**
   * Keeps the name plain text. Set by the screens a player must not leave by a
   * stray tap: the lobby, the game and the home page itself. Every other screen
   * leaves it out, and the name there is a link to the home page.
   */
  readonly plainWordmark?: boolean;
}

/** One screen's contribution to the slot, and whose it is. */
export interface FrameSlotEntry extends FrameSlotContent {
  readonly id: string;
}

/** How a filler writes to and removes itself from the slot. */
export interface FrameSlotWriter {
  readonly put: (entry: FrameSlotEntry) => void;
  readonly remove: (id: string) => void;
}

/**
 * Two contexts and not one, on purpose. The frame reads the content; a screen
 * only writes. A screen that read it too would be drawn again by every change it
 * made itself.
 */
export const FrameSlotContentContext = createContext<FrameSlotContent>({});
export const FrameSlotWriterContext = createContext<FrameSlotWriter | null>(null);

/** What the slot holds now; read by the frame's header. */
export const useFrameSlotContent = (): FrameSlotContent => useContext(FrameSlotContentContext);

/**
 * Fills the frame's slot for as long as the calling screen is mounted.
 *
 * Without a {@link FrameSlotProvider} above it, which is a screen drawn alone in
 * the workshop or a test, it does nothing.
 *
 * @param content - The status line and the action this screen offers
 *
 * @example
 * useFrameSlot({ status: 'Playing with Ana', action: <EndGameButton /> });
 */
export const useFrameSlot = ({ status, action, plainWordmark }: FrameSlotContent): void => {
  const id = useId();
  const writer = useContext(FrameSlotWriterContext);

  useEffect(() => {
    writer?.put({ id, status, action, plainWordmark });
  }, [writer, id, status, action, plainWordmark]);

  useEffect(() => {
    return () => writer?.remove(id);
  }, [writer, id]);
};
