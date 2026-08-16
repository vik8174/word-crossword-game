import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initializeErrorReporting } from './telemetry/sentry';

// Before anything is rendered, so an error thrown while the app is starting is
// reported too. Without a DSN this does nothing at all.
initializeErrorReporting(import.meta.env);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
