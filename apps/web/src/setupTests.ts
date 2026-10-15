import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// @testing-library/react only auto-registers cleanup when `afterEach` is a
// global (requires `test.globals: true`), which this project intentionally
// does not enable. Register it explicitly so the DOM is reset between tests
// within the same file — otherwise a second render() in the same describe
// block sees leftover DOM from the previous test.
afterEach(cleanup);
