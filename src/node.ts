// Global Types
import type {
  NextFunction as $Next,
  Request as $Request,
  RequestHandler as $Middleware,
  Response as $Response,
} from 'express';

// Helpers
import _ from 'lodash';
import {
  v4 as uuidv4,
} from 'uuid';

import * as Sentry from '@sentry/node';

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
