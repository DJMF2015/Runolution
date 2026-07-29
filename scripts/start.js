const getMiddlewareEntries = (registrations) => {
  return registrations.flatMap((registration, registrationIndex) => {
    const [pathOrMiddleware, ...handlers] = registration;

    if (typeof pathOrMiddleware === 'function') {
      return registration.map((middleware, middlewareIndex) => ({
        name: `cra-after-middleware-${registrationIndex}-${middlewareIndex}`,
        middleware,
      }));
    }

    return handlers.map((middleware, middlewareIndex) => ({
      name: `cra-after-middleware-${registrationIndex}-${middlewareIndex}`,
      path: pathOrMiddleware,
      middleware,
    }));
  });
};

const captureAfterMiddlewares = (devServer, onAfterSetupMiddleware) => {
  if (!onAfterSetupMiddleware) {
    return [];
  }

  const registrations = [];
  const originalUse = devServer.app.use;

  devServer.app.use = (...middlewareArguments) => {
    registrations.push(middlewareArguments);
    return devServer.app;
  };

  try {
    onAfterSetupMiddleware(devServer);
  } finally {
    devServer.app.use = originalUse;
  }

  return getMiddlewareEntries(registrations);
};

const migrateLegacyMiddlewareHooks = (config) => {
  const onBeforeSetupMiddleware = config.onBeforeSetupMiddleware;
  const onAfterSetupMiddleware = config.onAfterSetupMiddleware;

  if (!onBeforeSetupMiddleware && !onAfterSetupMiddleware) {
    return config;
  }

  delete config.onBeforeSetupMiddleware;
  delete config.onAfterSetupMiddleware;

  config.setupMiddlewares = (middlewares, devServer) => {
    if (!devServer) {
      throw new Error('webpack-dev-server is not defined');
    }

    onBeforeSetupMiddleware?.(devServer);

    return [
      ...middlewares,
      ...captureAfterMiddlewares(devServer, onAfterSetupMiddleware),
    ];
  };

  return config;
};

const supportsSetupMiddlewares = () => {
  const [major, minor] = require('webpack-dev-server/package.json')
    .version.split('.')
    .map(Number);

  return major > 4 || (major === 4 && minor >= 7);
};

const installCraDevServerCompatibility = () => {
  if (!supportsSetupMiddlewares()) {
    return;
  }

  const configPath = require.resolve('react-scripts/config/webpackDevServer.config');
  const createDevServerConfig = require(configPath);

  require.cache[configPath].exports = (proxy, allowedHost) => {
    return migrateLegacyMiddlewareHooks(createDevServerConfig(proxy, allowedHost));
  };
};

if (require.main === module) {
  installCraDevServerCompatibility();
  require('react-scripts/scripts/start');
}

module.exports = {
  migrateLegacyMiddlewareHooks,
  supportsSetupMiddlewares,
};
