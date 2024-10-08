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
  BaseErrorKey,
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

type $Sentry = {
  init: (config: $Config) => void;
} & Hub;

type $ResponseError = {
  config: {
    baseURL: string;
    data?: Record<string, unknown>;
    headers: Record<string, string>;
    method: string;
    url: string;
  };
  message: string;
  name: string;
  response: {
    data?: Record<string, unknown>;
    headers: Record<string, string>;
    status: number;
  };
};

type $LogOutput = 'error' | 'full';

type $Instance = {
  enabled: boolean;
  integrations: Array<Integration>;
  logOutput: $LogOutput | null;
  Sentry: $Sentry;
};

export type $ErrorLog = {
  readonly context: (
    message: string,
    data?: Array<unknown> | null | Record<string, unknown> | string,
  ) => void;
  readonly exception: (
    error: $CustomError | Error,
    levelOverride?: $ErrorLevel,
  ) => void;
  readonly finishTransaction: (
    tr: Transaction,
    params?: Record<string, unknown>,
  ) => void;
  readonly init: (
    config: $Config,
    enabledEnvironments?: Array<string>,
    enabledLogOutputEnvironments?: Record<string, $LogOutput>,
  ) => void;
  readonly request: (
    req: $Request,
  ) => Transaction;
  readonly setTransactionData: (
    tr: Transaction,
    params: Record<string, unknown>,
  ) => void;
  readonly setUser: (
    params: Record<string, string>,
  ) => void;
  readonly transaction: (
    params: {
      description?: string,
      name: string,
      op: string,
    },
  ) => Transaction,
};

export const init = ({
  enabled,
  integrations,
  logOutput,
  Sentry,
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
  enabled,
  logOutput,
  Sentry,
}: $Instance, params: Record<string, string>): void => {
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
  data?: Array<unknown> | null | Record<string, unknown> | string,
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
}: $Instance, req: $Request): Transaction => {
  const requestId: string | undefined = _.get(
    req,
    'id',
  );

  const user: Record<string, unknown> | undefined = _.get(
    req,
    'user',
  );

  const {
    method,
    originalUrl,
  } = req;

  if (enabled) {
    Sentry.setExtra(
      'Method',
      method,
    );
    Sentry.setExtra(
      'Route',
      originalUrl,
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

  const params = {
    name: `${method} ${originalUrl}`,
    op: 'http.request',
  };

  return Sentry.startTransaction(params);
};

// eslint-disable-next-line complexity
export const exception = <E extends (($CustomError | $ResponseError | Error) & { name: string })>({
  enabled,
  logOutput,
  Sentry,
}: $Instance, error: E, levelOverride: $ErrorLevel | void): void => {
  let data = _.get(
    error as $CustomError,
    'data',
  ) as Record<string, unknown> | undefined;

  let key: string | undefined = _.get(
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

    const dataKey = _.get(
      response,
      'data.key',
    ) as string | undefined;

    key = dataKey || BaseErrorKey.responseError;

    const foundMessage = _.get(
      response,
      'data.message',
      message,
    ) as string;

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

const transaction = (
  {
    logOutput,
    Sentry,
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

const setTransactionData = (tr, params) => {
  _.forEach(
    params,
    (
      value: unknown,
      key: string,
    ) => tr.setData(
      key,
      value,
    ),
  );
};

export const createErrorLog = (Sentry, integrations: Array<Integration>): $ErrorLog => {
  const instance: $Instance = {
    // Sends data to sentry
    enabled: true,
    integrations,
    // Sends data to console
    logOutput: null,
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
    finishTransaction: (tr, data) => {
      if (data) {
        setTransactionData(
          tr,
          data,
        );
      }

      tr.finish();
    },
    init: (config, enabledEnvironments, enabledLogOutputEnvironments) => {
      instance.enabled = isEnabledEnvironment(
        config.environment,
        enabledEnvironments,
      );

      if (enabledLogOutputEnvironments
        && typeof enabledLogOutputEnvironments === 'object'
        && config.environment in enabledLogOutputEnvironments
      ) {
        instance.logOutput = enabledLogOutputEnvironments[config.environment];
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
    setTransactionData: (tr, data) => setTransactionData(
      tr,
      data,
    ),
    setUser: (params) => setUser(
      instance,
      params,
    ),
    transaction: (params) => transaction(
      instance,
      params,
    ),
  };

  return ErrorLog;
};
