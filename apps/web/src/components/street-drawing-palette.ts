/**
 * The colours only the street drawing uses, by the names the drawing gives them
 * in `design/templates/state-tree.html` (lines 431-434 and 578).
 *
 * The drawing's other eight colours are the app's own and are read from
 * `STREET` (`street.ts`, #243). Nothing else in the drawing's components names
 * a hex value, so this is the one place a colour of the picture can change
 * without changing the app's.
 */
export const DRAWING_PALETTE = {
  /** An unlit window or arch. */
  dark: '#9DB3B6',
  /** The tin cans. */
  can: '#E3EAE9',
  /** Whitewash. */
  white: '#FBF7EE',
  /** The shade on the house at the end of the street. */
  shade: '#EDE3D2',
  /** Terracotta eaves and chimneys. */
  terra: '#C2603A',
  /** Azulejo tiles, and the right neighbour's shirt. */
  azul: '#2E5C8A',
  /** Geranium flowers. */
  gera: '#C8412E',
  /** Flower pots. */
  pot: '#B4643C',
  /** Leaves. */
  leaf: '#3F7A4E',
  /** The sixth colour of the lanterns and the confetti. */
  orange: '#E58A3A',
  /** The three skin tones: left neighbour, right neighbour, teacher. */
  skin: ['#E9B892', '#C08A62', '#8E5E40'],
  /** The three hair tones: left neighbour, right neighbour, teacher. */
  hair: ['#3B2A20', '#1B2D38', '#A8AFB2'],
} as const;
