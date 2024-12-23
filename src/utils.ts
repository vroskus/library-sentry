// Global Types
import type {
  $CustomError,
} from '@vroskus/library-error';

// Helpers
import _ from 'lodash';

// Types
type $ContextData = Record<string, string>;

const jsonIdent: number = 2;

export const isEnabledEnvironment = (
  environment: string,
  environments?: Array<string>,
): boolean => {
  if (!environments) {
    return true;
  }

  return environments.includes(environment);
};

export const throwError = (
  error: $CustomError,
): void => {
  throw error;
};

const prepareContextDataValue = (
  value: unknown,
): string => {
  if (_.isObject(value) || _.isArray(value)) {
    return JSON.stringify(
      value,
      undefined,
      jsonIdent,
    ) as string;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return 'Invalid value';
};

export const prepareContextData = (
  data?: Array<unknown> | null | Record<string, unknown> | string,
): $ContextData => {
  const contextData = {
  };

  if (data) {
    if (_.isString(data) || _.isNumber(data)) {
      _.set(
        contextData,
        'data',
        data,
      );
    } else {
      _.forEach(
        data,
        (value: unknown, key: string) => {
          _.set(
            contextData,
            key,
            prepareContextDataValue(value),
          );
        },
      );
    }
  }

  return contextData;
};
