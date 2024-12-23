// Global Types
import type {
  RequestHandler as $Middleware,
  NextFunction as $Next,
  Request as $Request,
  Response as $Response,
} from 'express';

// Helpers
import _ from 'lodash';
import {
  v4 as uuidv4,
} from 'uuid';

import * as Sentry from '@sentry/node';
import {
  nodeProfilingIntegration,
} from '@sentry/profiling-node';

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
    nodeProfilingIntegration(),
  ],
);

export const requestIdMiddleware = (): $Middleware => (
  req: $Request,
  res: $Response,
  next: $Next,
) => {
  const headerName = 'X-Request-Id';
  const oldValue: string | void = req.get(headerName);
  const id: string = oldValue === undefined ? uuidv4() : oldValue;

  res.set(
    headerName,
    id,
  );

  _.set(
    req,
    'id',
    id,
  );

  next();
};

export default ErrorLog;
