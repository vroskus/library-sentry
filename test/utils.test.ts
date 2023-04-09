import {
  baseErrorKey,
  CustomError,
} from '@vroskus/library-error';
import {
  isEnabledEnvironment,
  throwError,
} from '../src/utils';

describe(
  'utils',
  () => {
    beforeEach(() => {
      jest.resetModules();
    });

    describe(
      'isEnabledEnvironment',
      () => {
        it(
          'should return true if environments are not provided',
          () => {
            const environment = 'env1';

            expect(isEnabledEnvironment(
              environment,
              undefined,
            )).toBe(true);
          },
        );

        it(
          'should return true if environment is in environments list',
          () => {
            const environment = 'env1';
            const environments = [environment, 'env2', 'env3'];

            expect(isEnabledEnvironment(
              environment,
              environments,
            )).toBe(true);
          },
        );

        it(
          'should return false if environment is not in environments list',
          () => {
            const environment = 'env1';
            const environments = ['env2', 'env3'];

            expect(isEnabledEnvironment(
              environment,
              environments,
            )).toBe(false);
          },
        );
      },
    );

    describe(
      'throwError',
      () => {
        it(
          'should should throw provided error',
          () => {
            const error = new CustomError(
              'Error',
              baseErrorKey.unknownError,
              {
                data: {
                  random: 'value',
                },
              },
            );

            let thrownError;

            try {
              throwError(error);
            } catch (err) {
              thrownError = err;
            }

            expect(error).toEqual(thrownError);
          },
        );
      },
    );
  },
);
