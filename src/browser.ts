import * as Sentry from '@sentry/browser';

import {
  createErrorLog,
} from './common';
import {
  throwError as throwErrorHelper,
} from './utils';

import type {
  $ErrorLog,
} from './common';

export const throwError = throwErrorHelper;

const ErrorLog: $ErrorLog = createErrorLog(Sentry);

export default ErrorLog;
