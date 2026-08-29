import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// @testing-library/react only auto-registers cleanup when `afterEach` is a
// global (requires `test.globals: true`), which this project intentionally
// does not enable. Register it explicitly so the DOM is reset between tests
// within the same file — otherwise a second render() in the same describe
// block sees leftover DOM from the previous test.
afterEach(cleanup);

// jsdom has no canvas behind `getContext` and says so, loudly, through the
// virtual console — once for every test that renders the app, since the garden
// behind it reaches for one (`garden/Garden.tsx`). What it does after saying so
// is return `null`, which is exactly what the garden is written to survive, so
// this says the same thing quietly. A test that wants a canvas to read back
// stubs its own (`garden/Garden.test.tsx`).
HTMLCanvasElement.prototype.getContext = () => null;
