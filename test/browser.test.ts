import {
  Request,
} from 'jest-express/lib/request';
import {
  CustomError,
} from '@vroskus/library-error';

describe(
  'index',
  () => {
    beforeEach(() => {
      jest.mock('@sentry/browser');
    });

    afterEach(() => {
      jest.resetModules();
      jest.resetAllMocks();
    });

    describe(
      'ErrorLog',
      () => {
        it(
          'should successfully init',
          async () => {
            const Sentry = await import('@sentry/browser');

            const ErrorLog = (await import('../src/browser')).default;

            const spies = {
              init: jest.spyOn(
                Sentry,
                'init',
              ),
            };

            const config = {
              dsn: 'dsn1',
              environment: 'env1',
              release: '1.0.0',
            };
            const enabledEnvironments = [config.environment];
            const enabledLogOutputEnvironments = {
              [config.environment]: 'full',
            };

            ErrorLog.init(
              config,
              enabledEnvironments,
              enabledLogOutputEnvironments,
            );

            expect(spies.init).toHaveBeenCalledWith(config);
          },
        );

        it(
          'should successfully setup user',
          async () => {
            const Sentry = await import('@sentry/browser');
            const ErrorLog = (await import('../src/browser')).default;

            const scopeMethods = {
              setUser: jest.fn(),
            };

            Sentry.configureScope = jest.fn((scope) => scope(scopeMethods));

            const spies = {
              configureScope: jest.spyOn(
                Sentry,
                'configureScope',
              ),
            };

            const user = {
              id: 1,
              name: 'Random',
            };

            ErrorLog.setUser(user);

            expect(spies.configureScope).toHaveBeenCalled();
            expect(scopeMethods.setUser).toHaveBeenCalledWith(user);
          },
        );

        it(
          'should successfully add context',
          async () => {
            const Sentry = await import('@sentry/browser');
            const ErrorLog = (await import('../src/browser')).default;

            const spies = {
              addBreadcrumb: jest.spyOn(
                Sentry,
                'addBreadcrumb',
              ),
            };

            const message = 'Random';
            const data = {
              random: 'value',
            };

            ErrorLog.context(
              message,
              data,
            );

            expect(spies.addBreadcrumb).toHaveBeenCalledWith({
              data: {
                context: JSON.stringify(
                  data,
                  undefined,
                  2,
                ),
              },
              message,
            });
          },
        );

        it(
          'should successfully set request id',
          async () => {
            const Sentry = await import('@sentry/browser');
            const ErrorLog = (await import('../src/browser')).default;

            const scopeMethods = {
              clear: jest.fn(),
              setExtra: jest.fn(),
              setTag: jest.fn(),
              setUser: jest.fn(),
            };

            Sentry.configureScope = jest.fn((scope) => scope(scopeMethods));

            const spies = {
              configureScope: jest.spyOn(
                Sentry,
                'configureScope',
              ),
            };

            const route = '/route1';
            const requestId = '1';
            const user = {
              id: 1,
              name: 'Random',
            };
            const req = new Request(route);

            req.id = requestId;
            req.user = user;

            ErrorLog.request(req);

            expect(spies.configureScope).toHaveBeenCalled();
            expect(scopeMethods.setTag).toHaveBeenCalledWith(
              'request.id',
              requestId,
            );
            expect(scopeMethods.setExtra).toHaveBeenCalledWith(
              'Route',
              route,
            );
            expect(scopeMethods.setUser).toHaveBeenCalledWith(user);
          },
        );

        it(
          'should successfully handle exception',
          async () => {
            const Sentry = await import('@sentry/browser');
            const ErrorLog = (await import('../src/browser')).default;

            const spies = {
              captureException: jest.spyOn(
                Sentry,
                'captureException',
              ),
            };

            const error = new Error('Error');

            ErrorLog.exception(error);

            expect(spies.captureException).toHaveBeenCalledWith(error);
          },
        );

        it(
          'should successfully handle handled exception',
          async () => {
            const Sentry = await import('@sentry/browser');
            const ErrorLog = (await import('../src/browser')).default;

            const scopeMethods = {
              clear: jest.fn(),
              setTag: jest.fn(),
            };

            Sentry.configureScope = jest.fn((scope) => scope(scopeMethods));

            const spies = {
              addBreadcrumb: jest.spyOn(
                Sentry,
                'addBreadcrumb',
              ),
              captureException: jest.spyOn(
                Sentry,
                'captureException',
              ),
              configureScope: jest.spyOn(
                Sentry,
                'configureScope',
              ),
            };

            const error = new CustomError(
              'Error',
              'RANDOM',
              {
                data: {
                  random: 'value',
                },
              },
            );

            ErrorLog.exception(error);

            expect(spies.captureException).toHaveBeenCalledWith(new Error(error.message));
            expect(spies.configureScope).toHaveBeenCalled();
            expect(scopeMethods.setTag).toHaveBeenCalledWith(
              'error.key',
              error.key,
            );
            expect(spies.addBreadcrumb).toHaveBeenCalledWith({
              data: {
                context: JSON.stringify(
                  error.data,
                  undefined,
                  2,
                ),
              },
              message: 'Error data',
            });
            expect(scopeMethods.clear).toHaveBeenCalled();
          },
        );
      },
    );
  },
);
