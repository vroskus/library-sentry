// Global Types
import type {
  Request as $Request,
} from 'express';
import type {
  $CustomError,
  $ErrorLevel,
} from '@vroskus/library-error';

// Global Enums
import {
  baseErrorKey,
} from '@vroskus/library-error';

// Helpers
import type {
  Hub,
} from '@sentry/types';
import _ from 'lodash';

// Utils
import {
  isEnabledEnvironment,
  prapareContextData,
} from './utils';

// Types
type $Sentry = Hub & {
  init: (config: $Config) => void;
};

type $ResponseError = {
  message: string;
  name: string;
  config: {
    baseURL: string;
    data: object;
    headers: Record<string, string>;
    method: string;
    url: string;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    data: object;
  };
};

type $Config = {
  dsn: string;
  environment: string;
  release: string;
  httpProxy?: string;
  httpsProxy?: string;
  denyUrls?: Array<string | RegExp>;
};

type $LogOutput = 'full' | 'error';

type $Instance = {
  Sentry: $Sentry;
  enabled: boolean;
  logOutput: $LogOutput | null;
};

type $Scope = {
  addBreadcrumb: (arg0: {
    data: Record<string, unknown>,
    message: string,
  }) => void,
  setLevel: (arg0: string) => void,
  setTag: (arg0: string, arg1: string) => void,
};

export type $ErrorLog = {
  readonly init: (
    config: $Config,
    enabledEnvironments?: Array<string>,
    enabledLogOutputEnvironments?: Record<string, $LogOutput>,
  ) => void;
  readonly setUser: (params: object) => void;
  readonly context: (
    message: string,
    data?: Array<unknown> | Record<string, unknown> | string | null,
  ) => void;
  readonly request: (req: $Request) => void;
  readonly exception: (error: Error | $CustomError, levelOverride?: $ErrorLevel) => void;
};

export const init = ({
  enabled,
  logOutput,
  Sentry,
}: $Instance, config: $Config): void => {
  if (enabled) {
    Sentry.init(config);
  }

  if (logOutput !== null) {
    // eslint-disable-next-line no-console
    console.warn('ErrorLog on');
  }
};

export const setUser = ({
  enabled,
  logOutput,
  Sentry,
}: $Instance, params: unknown): void => {
  if (enabled) {
    Sentry.setUser(params);
  }

  if (logOutput === 'full') {
    // eslint-disable-next-line no-console
    console.warn(
      'ErrorLog user: ',
      params,
    );
  }
};

export const context = (
  {
    enabled,
    logOutput,
    Sentry,
  }: $Instance,
  message: string,
  data?: Array<unknown> | Record<string, unknown> | string | null,
): void => {
  const preparedData = prapareContextData(data);

  if (enabled) {
    Sentry.addBreadcrumb({
      data: preparedData,
      message,
    });
  }

  if (logOutput === 'full') {
    // eslint-disable-next-line no-console
    console.warn(
      'ErrorLog context: ',
      message,
      preparedData,
    );
  }
};

export const request = ({
  enabled,
  logOutput,
  Sentry,
}: $Instance, req: $Request): void => {
  const requestId: string | void = _.get(
    req,
    'id',
  );

  const user: Record<string, unknown> | void = _.get(
    req,
    'user',
  );

  if (enabled) {
    Sentry.setExtra(
      'Method',
      req.method,
    );
    Sentry.setExtra(
      'Route',
      req.originalUrl,
    );
    Sentry.setExtra(
      'Body',
      JSON.stringify(
        req.body,
        undefined,
        2,
      ),
    );
    Sentry.setExtra(
      'Params',
      JSON.stringify(
        req.params,
        undefined,
        2,
      ),
    );

    if (requestId) {
      Sentry.setExtra(
        'RequestId',
        requestId,
      );
    }

    if (user) {
      Sentry.setUser(user);
    }
  }

  if (logOutput === 'full') {
    // eslint-disable-next-line no-console
    console.warn(
      'ErrorLog request: ',
      {
        Body: req.body,
        Method: req.method,
        RequestId: requestId,
        Route: req.originalUrl,
        User: user,
      },
    );
  }
};

// eslint-disable-next-line complexity
export const exception = <E extends ((Error | $CustomError | $ResponseError) & { name: string })>({
  enabled,
  logOutput,
  Sentry,
}: $Instance, error: E, levelOverride: $ErrorLevel | void): void => {
  let data: Record<string, unknown> | void = _.get(
    error as $CustomError,
    'data',
  );

  let key: string | void = _.get(
    error as $CustomError,
    'key',
  );

  const level: $ErrorLevel | void = levelOverride || _.get(
    error as $CustomError,
    'level',
    'error',
  );

  const {
    config,
    response,
  } = error as $ResponseError;

  const {
    message,
  } = error as Error;

  let {
    name,
  } = error as Error;

  if (config && response) {
    data = {
      requestData: config.data,
      requestHeaders: config.headers,
      responseData: response.data,
      responseHeaders: response.headers,
      route: `${config.method.toUpperCase()} ${config.baseURL || ''}${config.url}`,
      status: response.status,
    };

    key = _.get(
      response,
      'data.key',
      baseErrorKey.responseError,
    );

    const foundMessage: string = _.get(
      response,
      'data.message',
      message,
    );

    // eslint-disable-next-line no-param-reassign
    name = `${key}: ${foundMessage}`;
  }

  let preparedData;

  if (data) {
    preparedData = prapareContextData(data);
  }

  if (enabled) {
    Sentry.withScope(async (scope: $Scope) => {
      if (data) {
        scope.addBreadcrumb({
          data: preparedData,
          message: 'Error data',
        });
      }

      if (key) {
        scope.setTag(
          'error.key',
          key,
        );
      }

      if (level) {
        scope.setLevel(level);
      }

      Sentry.captureException(error);
    });
  }

  if (logOutput !== null) {
    // eslint-disable-next-line no-console
    console.error(
      'ErrorLog error context: ',
      {
        data: preparedData,
        key,
        level,
        message,
        name,
      },
    );

    // eslint-disable-next-line no-console
    console.error(
      'ErrorLog error: ',
      error,
    );
  }
};

export const createErrorLog = (Sentry): $ErrorLog => {
  const instance: $Instance = {
    enabled: true,
    // Sends data to sentry
    logOutput: null,
    // Sends data to console
    Sentry,
  };

  const ErrorLog: $ErrorLog = {
    context: (message, data) => context(
      instance,
      message,
      data,
    ),
    exception: (error, levelOverride) => exception(
      instance,
      error,
      levelOverride,
    ),
    init: (config, enabledEnvironments, enabledLogOutputEnvironments) => {
      instance.enabled = isEnabledEnvironment(
        config.environment,
        enabledEnvironments,
      );

      if (enabledLogOutputEnvironments && typeof enabledLogOutputEnvironments === 'object') {
        if (config.environment in enabledLogOutputEnvironments) {
          instance.logOutput = enabledLogOutputEnvironments[config.environment];
        }
      }

      init(
        instance,
        config,
      );
    },
    request: (req) => request(
      instance,
      req,
    ),
    setUser: (params) => setUser(
      instance,
      params,
    ),
  };

  return ErrorLog;
};
