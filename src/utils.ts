// Global Types
import type {
  $CustomError,
} from '@vroskus/library-error';

// Helpers
import _ from 'lodash';

// Types
type $ContextData = Record<string, string>;

type $IsEnabledEnvironment = (environment: string, environments?: Array<string>) => boolean;

export const isEnabledEnvironment: $IsEnabledEnvironment = (environment, environments) => {
  if (!environments) {
    return true;
  }

  return environments.includes(environment);
};

type $ThrowError = (error: $CustomError) => void;

export const throwError: $ThrowError = (error) => {
  throw error;
};

const prepareContextDataValue = (
  value: unknown,
): string => {
  if (_.isObject(value) || _.isArray(value)) {
    return JSON.stringify(
      value,
      undefined,
      2,
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

type $PrapareContextData = (
  data?: Array<unknown> | null | Record<string, unknown> | string,
) => $ContextData;

export const prapareContextData: $PrapareContextData = (data) => {
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
