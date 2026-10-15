/**
 * Marks an element as one block of its screen. The block rises with the others
 * when the screen opens, in the order the blocks stand in the page
 * (`ScreenEnter`, `motion-styles.ts`).
 *
 * Spread it onto the element: `<Box {...BLOCK_PROPS}>`.
 */
export const BLOCK_PROPS = { 'data-rise': '' } as const;

/**
 * Marks an element whose children are blocks of the screen, each of them,
 * instead of marking every child by hand: the drawing's `.zones > *`,
 * `.lobby-grid > *` and `.column .stack > *`.
 */
export const BLOCKS_PROPS = { 'data-rise-children': '' } as const;
