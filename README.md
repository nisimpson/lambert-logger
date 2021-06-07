# winston-cloudwatch

This library generates pre-configured loggers from the wonderful [winston logger](https://github.com/winstonjs/winston), formatted and optimized for AWS cloudwatch.

## Table of Contents

- [Usage](#usage)
- [Logging](#logging)
  - [Creating a Logger Factory](#creating-a-logger-factory)
  - [Logging Levels](#logging-levels)
  - [Configuration](#configuration)
    - [Factory Configuration](#factory-configuration)
    - [Instance Configuration](#instance-configuration)
  - [User Transforms](#user-transforms)
- [Development](#development)
  - [Commands](#commands)

## Usage

```javascript
// src/logging.js
import factory from 'winston-lambda';

const { getLogger } = factory.create({ name: "My Lambda" });

export default getLogger;

// src/my-module.js
import getLogger from './logging';

const logger = getLogger();

logger.info('Hello, World!'); // [info] My Lambda >> Hello, World!
```


## Logging
### Creating a Logger Factory

Before you can begin logging, you must first create a new Logger factory function for your application:

```javascript
import factory from 'winston-lambda';

const getLogger = factory.create(config); // config is optional; see customization
```

Use the factory function to generate logger instances, and use those instances to generate log messages.

```javascript
// method 1: export factory to import in other modules
export default getLogger;

// method 2: export a default logger instance
const instance = getLogger(config); // config is optional; see customization
export default instance;
```

### Logging Levels

Logging levels conform to the severity ordering specified by [RFC5424](https://tools.ietf.org/html/rfc5424): severity of all levels is assumed to be numerically ascending from most important to least important.

Each level is given a specific integer priority. The higher the priority the more important the message is considered to be, and the lower the corresponding integer priority. As specified exactly in RFC5424 the logger levels are prioritized from 0 to 6 (highest to lowest):

```javascript
{
  error: 0,   // critical errors that cause the process to fail
  warn: 1,    // errors that are recoverable but need to be documented
  info: 2,    // standard informational log; relevant to business domain
  verbose: 3, // noisy version of info; print object properties, configs, etc.
  debug: 4,   // information to help troubleshoot issues; ex. error stack traces
  silly: 5    // trace level information, should probably be removed before merge into dev/prod
}
```

Setting the level for your logging message can be accomplished by using the level specified methods defined on every logger instance.

```javascript
logger.info("127.0.0.1 - there's no place like home");
logger.warn("127.0.0.1 - there's no place like home");
logger.error("127.0.0.1 - there's no place like home");
```

Out of the box, the logger library filters log messages by level. The runtime environment determines the appropriate filter:

| environment | minimum log level |
| ----------- | ----------------- |
| default         | `silly` |
| AWS Development | `debug` |
| AWS Production  | `success` |

#### Lazy Logging

Certain logging levels are filtered from the stream, dependent upon the environment in which the application is currently executing in (production, development, etc). However, arguments passed into the log function are still evaluated, which may have a performance impact during runtime. If filtered log messages are affecting runtime performance, consider using the `lazy` version of the log level functions:

```javascript
// if the application is running in production, the supplied lambda will not be invoked.
logger.lazy.debug(log => log("Noisy configuration settings: ", collectConfig()));
```

### Configuration

#### Factory Configuration

Customize the logging factory by passing in an object to the `create` function with the following properties:

- `name`: Name to prepend to each log statement. Defaults to `Service`.
- `defaultMeta`: Object containing arbitrary information to include along every log message. See [winston documentation](https://github.com/winstonjs/winston#streams-objectmode-and-info-objects) for details.
- `testLevel`: Determines the lowest priority allowed during a test run. Defaults to `'error'`.
- `delimiter`: Delimiter between the name and the log message. Defaults to `>>`.
- `transforms`: Functions to format log statements before they are written. See [User Transforms](#user-transforms) section for details.
- `transformOpts`: Custom options accessible to all user transforms in the transforms list when provoked.
- `hooks`: Custom hooks used to extend or override base container functionality. Advanced use only.

#### Instance Configuration

Likewise, logger instances can be configured by passing in an object to the factory function with the following properties:

- `name`: Optional name of the logger instance. Used to identify log messages generated from specific modules in your application.

  ```javascript
  const getLogger = factory.create({ name: "My Lambda" });
  const log = getLogger({ name: "Submodule" });

  // [info] My Lambda >> Submodule >> All systems go!
  log.info("All systems go!");
  ```

### User Transforms

Transform functions allow you to transform log messages before they are written to the stream. You can add transforms by passing in a list to the factory configuration:

```javascript
const redactSecrets = (info, opts) => {
  //
  // context parameter provides:
  // - info: winston log transformable info
  // - opts: object containing helper functions and global transform options
  //
  const { splat } = opts.unpack(info);
    splat.forEach(arg => {
    if (arg.hasOwnProperty('secret')) {
      arg['secret'] = '********'
    }
  });
  return info;
};

const deepCopy = (context, next) => {
  const { splat } = opts.unpack(info);
  // Use Lodash to deep clone and prevent side effects
  const cloned = _.cloneDeep(splat);
  opts.pack(info, { splat: cloned });
  return info;
};

const getLogger = factory.create({ name: "Example", transforms: [deepCopy, redactSecrets] });
const log = getLogger();

// [info] Example >> Received data: { foo: "bar", secret: "********" }
log.info("Received data: ", { foo: "bar", secret: "my-secret" });
```

## Development

- Please see the [repository README](/README.md) for how to contribute as a developer, bug reporter, or maintainer.
- The library uses TSDX to manage configuration, builds, and publishing. If you plan on contributing as a developer, check out TSDX's documentation [here](https://tsdx.io).

### Commands

To perform a live build, use:

```bash
npm start # or yarn start
```

This builds to `/dist` and runs the project in watch mode so any edits you save inside `src` causes a rebuild to `/dist`.

To do a one-off build, use `npm run build` or `yarn build`.

To run tests, use `npm test` or `yarn test`.

### Jest

Jest tests are set up to run with `npm test` or `yarn test`.
