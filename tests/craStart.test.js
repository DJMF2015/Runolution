const {
  migrateLegacyMiddlewareHooks,
} = require('../scripts/start');

test('migrates CRA middleware hooks without changing their order', () => {
  const beforeMiddleware = jest.fn();
  const afterMiddleware = jest.fn();
  const app = {
    use: jest.fn(() => app),
  };
  const config = migrateLegacyMiddlewareHooks({
    onBeforeSetupMiddleware(devServer) {
      devServer.app.use(beforeMiddleware);
    },
    onAfterSetupMiddleware(devServer) {
      devServer.app.use(afterMiddleware);
    },
  });
  const builtInMiddleware = {
    name: 'webpack-dev-middleware',
    middleware: jest.fn(),
  };
  const middlewares = config.setupMiddlewares(
    [builtInMiddleware],
    { app },
  );

  expect(config.onBeforeSetupMiddleware).toBeUndefined();
  expect(config.onAfterSetupMiddleware).toBeUndefined();
  expect(app.use).toHaveBeenCalledWith(beforeMiddleware);
  expect(middlewares[0]).toBe(builtInMiddleware);
  expect(middlewares[1].middleware).toBe(afterMiddleware);
});
