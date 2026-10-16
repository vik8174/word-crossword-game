import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { CrashProbe } from './CrashProbe';

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CrashProbe />
    </MemoryRouter>,
  );

describe('CrashProbe', () => {
  it('throws on the dev server when the parameter is present, with any value', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => at('/create?__crash_probe__')).toThrow(/crash probe/i);
    expect(() => at('/?__crash_probe__=1')).toThrow(/crash probe/i);
  });

  it('renders nothing without the parameter', () => {
    expect(() => at('/create')).not.toThrow();
  });
});
