import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/**
 * Regression test for the test-infrastructure setup itself.
 *
 * @testing-library/react only auto-cleans the DOM between tests when
 * `afterEach` is a *global* (i.e. `test.globals: true` in the Vitest
 * config). This project keeps globals off and instead calls
 * `afterEach(cleanup)` explicitly in `setupTests.ts`. Two renders in the
 * same describe block would leave duplicate DOM nodes behind if that
 * cleanup call were ever removed or broken.
 */
describe('test DOM cleanup between tests', () => {
  it('renders a first element', () => {
    render(<button>first</button>);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('does not see leftover DOM from the previous test', () => {
    render(<button>second</button>);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
