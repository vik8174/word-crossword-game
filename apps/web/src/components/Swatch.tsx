import Box from '@mui/material/Box';

import { STREET } from '../street';
import { OUTLINE_WIDTH } from './surface-styles';

/**
 * A swatch of the teacher's two colours (`.sw`, `design/templates/state-tree.html`
 * lines 300-301): 15px across, in front of a student's name in the legend under
 * the board and in the heading of their list, so the name and the squares it
 * stands for are one thing to the eye.
 *
 * The left student's is `wash` in a ring of ink, the right student's `stone` in
 * a dotted one: the same two faces as the squares (`TeacherGrid`), drawn by
 * shape as well as by colour. It says nothing a reader who cannot see it would
 * miss, since the name beside it says whose words they are.
 */
const BASE_SX = {
  display: 'inline-block',
  width: '15px',
  height: '15px',
  borderRadius: '3px',
  verticalAlign: '-2px',
  marginRight: '6px',
} as const;

const FACE_SX = {
  left: {
    ...BASE_SX,
    backgroundColor: STREET.wash,
    boxShadow: `inset 0 0 0 ${OUTLINE_WIDTH}px ${STREET.ink}`,
  },
  right: {
    ...BASE_SX,
    backgroundColor: STREET.stone,
    outline: `${OUTLINE_WIDTH}px dotted ${STREET.ink}`,
    outlineOffset: `-${OUTLINE_WIDTH}px`,
  },
} as const;

/**
 * @param props.face - `left` for the student whose words are on `wash`, `right` for the other
 *
 * @example
 * <Swatch face="left" />
 */
export const Swatch = ({ face }: { readonly face: 'left' | 'right' }) => (
  <Box component="span" aria-hidden="true" sx={FACE_SX[face]} />
);
