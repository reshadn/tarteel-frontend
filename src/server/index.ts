/* eslint-disable no-console */
import 'babel-polyfill';
import 'isomorphic-fetch';

import appRootDir from 'app-root-dir';
import compression from 'compression';
import express from 'express';
import path from 'path';
import { resolve as pathResolve } from 'path';
import favicon from 'serve-favicon';
import cookiesMiddleware from 'universal-cookie-express'

import config from '../../config/index';
import { log } from '../../internal/utils';
import clientBundle from './middleware/clientBundle';
import errorHandlers from './middleware/errorHandlers';
import offlinePage from './middleware/offlinePage';
import reactApplication from './middleware/reactApplication/index';
import security from './middleware/security';
import serviceWorker from './middleware/serviceWorker';

// Create our express based server.
const app = express();

app.use(cookiesMiddleware())

// Don't expose any software information to potential hackers.
app.disable('x-powered-by');

// Security middlewares.
app.use(...security);

// Gzip compress the responses.
app.use(compression());


// Static content
app.use(
  favicon(
    path.join(process.cwd(), '/public/favicon.ico'),
  ),
);
app.use(
  '/public',
  express.static(
    path.join(process.cwd(), '/public')),
);
// app.use(
//   '/public',
//   express.static(
//     path.join(process.env.PWD || process.env.pm_cwd, '/public/dist')
//   )
// );

// Register our service worker generated by our webpack config.
// We do not want the service worker registered for development builds, and
// additionally only want it registered if the config allows.
if (process.env.BUILD_FLAG_IS_DEV === 'false' && config('serviceWorker.enabled')) {
  app.get(`/${config('serviceWorker.fileName')}`, serviceWorker);
  app.get(
    `${config('bundles.client.webPath')}${config('serviceWorker.offlinePageFileName')}`,
    offlinePage,
  );
}

// Configure serving of our client bundle.
app.use(config('bundles.client.webPath'), clientBundle);

// Configure static serving of our "public" root http path static files.
// Note: these will be served off the root (i.e. '/') of our application.
app.use(express.static(pathResolve(appRootDir.get(), config('publicAssetsPath'))));


app.get('*', (request, response, next) => {

  if (request.universalCookies.get('isFirstTime') === undefined) {
    request.universalCookies.set('isFirstTime', true, {path: '/'});
  }

  if (request.path === '/' && JSON.parse(request.universalCookies.get('isFirstTime'))) {
    const queryString = Object.entries(request.query).map(([key, val]) => `${key}=${val}`).join('&');
    return response.redirect(`/welcome/?${queryString}`)
  }

  next()
})

// The React application middleware.
app.get('*', (request, response) => {
  log({
    title: 'Request',
    level: 'special',
    message: `Received for "${request.url}"`,
  });

  return reactApplication(request, response);
});

// Error Handler middlewares.
app.use(...errorHandlers);

// Create an http listener for our express app.
const listener = app.listen(config('port'), () =>
  log({
    title: 'server',
    level: 'special',
    message: `✓

      ${config('welcomeMessage')}

      ${config('htmlPage.defaultTitle')} is ready!

      with

      Service Workers: ${config('serviceWorker.enabled')}
      Polyfills: ${config('polyfillIO.enabled')} (${config('polyfillIO.features').join(', ')})

      Server is now listening on Port ${config('port')}
      You can access it in the browser at http://${config('host')}:${config('port')}
      Press Ctrl-C to stop.



    `,
  }),
);

// We export the listener as it will be handy for our development hot reloader,
// or for exposing a general extension layer for application customisations.
export default listener;
