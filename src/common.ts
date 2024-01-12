// Global Types
import type {
  Request as $Request,
} from 'express';
import type {
  Hub,
  Integration,
  Scope,
  Transaction,
} from '@sentry/types';
import type {
  $CustomError,
  $ErrorLevel,
} from '@vroskus/library-error';

// Global Enums
import {
  baseErrorKey,
} from '@vroskus/library-error';

// Helpers
import _ from 'lodash';

// Utils
import {
  isEnabledEnvironment,
  prapareContextData,
} from './utils';

// Types
type $Config = {
  denyUrls?: Array<RegExp | string>;
  dsn: string;
  enableTracing?: boolean,
  environment: string;
  httpProxy?: string;
  httpsProxy?: string;
  integrations?: Array<Integration>;
  release: string;
};

type $Sentry = Hub & {
  init: (config: $Config) => void;
};

type $ResponseError = {
  config: {
    baseURL: string;
    data: object;
    headers: Record<string, string>;
    method: string;
    url: string;
  };
  message: string;
  name: string;
  response: {
    data: object;
    headers: Record<string, string>;
    status: number;
  };
};

type $LogOutput = 'error' | 'full';

type $Instance = {
  Sentry: $Sentry;
  enabled: boolean;
  integrations: Array<Integration>;
  logOutput: $LogOutput | null;
};

export type $ErrorLog = {
  readonly context: (
    message: string,
    data?: Array<unknown> | Record<string, unknown> | null | string,
  ) => void;
  readonly exception: (error: $CustomError | Error, levelOverride?: $ErrorLevel) => void;
  readonly getTransaction: (params: {
    description?: string,
    name: string,
    op: string,
  }) => Transaction,
  readonly init: (
    config: $Config,
    enabledEnvironments?: Array<string>,
    enabledLogOutputEnvironments?: Record<string, $LogOutput>,
  ) => void;
  readonly request: (req: $Request) => void;
  readonly setUser: (params: unknown) => void;
};

export const init = ({
  Sentry,
  enabled,
  integrations,
  logOutput,
}: $Instance, config: $Config): void => {
  if (enabled) {
    const preparedConfig = {
      enableTracing: true,
      ...config,
      integrations: [
        ...integrations,
        ...(config.integrations || []),
      ],
    };

    Sentry.init(preparedConfig);
  }

  if (logOutput !== null) {
    // eslint-disable-next-line no-console
    console.warn('ErrorLog on');
  }
};

export const setUser = ({
  Sentry,
  enabled,
  logOutput,
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
    Sentry,
    enabled,
    logOutput,
  }: $Instance,
  message: string,
  data?: Array<unknown> | Record<string, unknown> | null | string,
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
  Sentry,
  enabled,
  logOutput,
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
export const exception = <E extends (($CustomError | $ResponseError | Error) & { name: string })>({
  Sentry,
  enabled,
  logOutput,
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

    name = `${key}: ${foundMessage}`;
  }

  let preparedData;

  if (data) {
    preparedData = prapareContextData(data);
  }

  if (enabled) {
    Sentry.withScope(async (scope: Scope) => {
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

const getTransaction = (
  {
    Sentry,
    logOutput,
  }: $Instance,
  params: {
    description?: string,
    name: string,
    op: string,
  },
) => {
  if (logOutput !== null) {
    // eslint-disable-next-line no-console
    console.info(
      'ErrorLog transaction: ',
      params,
    );
  }

  return Sentry.startTransaction(params);
};

export const createErrorLog = (Sentry, integrations: Array<Integration>): $ErrorLog => {
  const instance: $Instance = {
    Sentry,
    // Sends data to sentry
    enabled: true,
    integrations,
    // Sends data to console
    logOutput: null,
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
    getTransaction: (params) => getTransaction(
      instance,
      params,
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
