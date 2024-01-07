// Helpers
import * as Sentry from '@sentry/browser';
import {
  Integrations,
} from '@sentry/tracing';

import {
  createErrorLog,
} from './common';
import {
  throwError as throwErrorHelper,
} from './utils';

// Types
import type {
  $ErrorLog,
} from './common';

export const throwError = throwErrorHelper;

const ErrorLog: $ErrorLog = createErrorLog(
  Sentry,
  [
    new Integrations.BrowserTracing(),
  ],
);

export default ErrorLog;
