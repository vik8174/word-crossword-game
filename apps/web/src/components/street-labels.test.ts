import { describe, expect, it } from 'vitest';

import {
  type LessonView,
  lobbyStreetLabel,
  joinStreetLabel,
  TEACHER_CLAUSE,
  teacherDrawnFor,
} from './street-labels';

const CLAUSE = ', and the teacher watching from the house at the end of the street';

/** How many times a string stands in another. */
const countOf = (text: string, part: string): number => text.split(part).length - 1;

const TEACHER: LessonView = { viewer: 'teacher' };
const STUDENT_WITH_TEACHER_HERE: LessonView = { viewer: 'student', teacherAway: false };
const STUDENT_WITH_TEACHER_AWAY: LessonView = { viewer: 'student', teacherAway: true };

describe('the label of a pair game’s lobby (#227), unchanged', () => {
  it('names the host’s own balcony while they wait', () => {
    expect(lobbyStreetLabel({ players: 1, seatFreedBySilence: false })).toBe(
      'Your balcony, and the one across the street still empty',
    );
  });

  it('says both balconies are taken once they are two', () => {
    expect(lobbyStreetLabel({ players: 2, seatFreedBySilence: false })).toBe(
      'Both balconies taken, the line strung between them',
    );
  });

  it('says the curtains are drawn when the second seat was freed by silence', () => {
    expect(lobbyStreetLabel({ players: 2, seatFreedBySilence: true })).toBe(
      'Both balconies taken, the curtains drawn across the street',
    );
  });

  it('never mentions a teacher', () => {
    for (const players of [1, 2]) {
      expect(lobbyStreetLabel({ players, seatFreedBySilence: false })).not.toMatch(/teacher/i);
    }
  });
});

describe('the label of a lesson’s lobby, for the teacher', () => {
  it('says both balconies are empty with nobody in, and names no balcony as the teacher’s', () => {
    const label = lobbyStreetLabel({ players: 0, seatFreedBySilence: false, lesson: TEACHER });

    expect(label).toBe(`Both balconies still empty${CLAUSE}`);
    expect(label).not.toMatch(/your balcony/i);
  });

  it('says one balcony is taken with one student in, and not that it is the teacher’s own', () => {
    const label = lobbyStreetLabel({ players: 1, seatFreedBySilence: false, lesson: TEACHER });

    expect(label).toBe(`One balcony taken, the other still empty${CLAUSE}`);
    expect(label).not.toMatch(/your balcony/i);
  });

  it('says both are taken with two students in', () => {
    expect(lobbyStreetLabel({ players: 2, seatFreedBySilence: false, lesson: TEACHER })).toBe(
      `Both balconies taken, the line strung between them${CLAUSE}`,
    );
  });

  it('keeps the curtains of a seat freed by silence, and the teacher still at their window', () => {
    expect(lobbyStreetLabel({ players: 2, seatFreedBySilence: true, lesson: TEACHER })).toBe(
      `Both balconies taken, the curtains drawn across the street${CLAUSE}`,
    );
  });

  it.each([0, 1, 2])('names the teacher exactly once with %i students in', (players) => {
    const label = lobbyStreetLabel({ players, seatFreedBySilence: false, lesson: TEACHER });

    expect(countOf(label, 'teacher')).toBe(1);
    expect(label.endsWith(TEACHER_CLAUSE)).toBe(true);
  });
});

describe('the label of a lesson’s lobby, for a student', () => {
  it('names their own balcony while the other is empty, and the teacher once while they are here', () => {
    expect(
      lobbyStreetLabel({
        players: 1,
        seatFreedBySilence: false,
        lesson: STUDENT_WITH_TEACHER_HERE,
      }),
    ).toBe(`Your balcony, and the one across the street still empty${CLAUSE}`);
  });

  it('says both are taken with two in', () => {
    expect(
      lobbyStreetLabel({
        players: 2,
        seatFreedBySilence: false,
        lesson: STUDENT_WITH_TEACHER_HERE,
      }),
    ).toBe(`Both balconies taken, the line strung between them${CLAUSE}`);
  });

  it.each([1, 2])(
    'leaves the clause out while the teacher is away, with %i students in',
    (players) => {
      const label = lobbyStreetLabel({
        players,
        seatFreedBySilence: false,
        lesson: STUDENT_WITH_TEACHER_AWAY,
      });

      expect(label).not.toMatch(/teacher/i);
    },
  );
});

describe('the teacher on their own screen', () => {
  it('is always drawn at their window, because a teacher has no way to be seen away by themselves', () => {
    expect(teacherDrawnFor(TEACHER)).toBe('here');
  });

  it('is drawn at their window for a student until the teacher’s mark is old, and then behind curtains', () => {
    expect(teacherDrawnFor(STUDENT_WITH_TEACHER_HERE)).toBe('here');
    expect(teacherDrawnFor(STUDENT_WITH_TEACHER_AWAY)).toBe('away');
  });
});

describe('the label of the door (#226)', () => {
  const DOOR =
    'A neighbour waving from her balcony, holding out a line to an empty balcony across the street';

  it('is #226’s own for a pair game', () => {
    expect(joinStreetLabel()).toBe(DOOR);
  });

  it('ends with the teacher’s clause once while the teacher is at their window', () => {
    expect(joinStreetLabel('here')).toBe(`${DOOR}${CLAUSE}`);
    expect(countOf(joinStreetLabel('here'), 'teacher')).toBe(1);
  });

  it('leaves the clause out while the teacher is away', () => {
    expect(joinStreetLabel('away')).toBe(DOOR);
  });
});
