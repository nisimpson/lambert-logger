# winston-cloudwatch

This library generates containers and loggers from the wonderful [winston logger](https://github.com/winstonjs/winston), optimized for AWS cloudwatch -- without having to worry about additional configuration (unless you *really* want to).

## Table of Contents

- [Usage](#usage)
- [Logging](#logging)
  - [Creating a Logger Factory](#creating-a-logger-factory)
  - [Logging Levels](#logging-levels)
  - [Configuration](#configuration)
    - [Factory Configuration](#factory-configuration)
    - [Instance Configuration](#instance-configuration)
  - [Middleware](#middleware)
  - [JSON Formatting](#json-formatting)
- [How to Contribute](#how-to-contribute)
  - [Commands](#commands)

## Usage

```javascript
// src/logging.js
import { create } from 'winston-lambda';

const getLogger = logger.createFactory({ name: "Orders Service" });

export default getLogger;

// src/my-module.js
import getLogger from './logging';

const logger = getLogger();

logger.info('Hello, Spring!'); // [info] Orders Service >> Hello, Spring!
```


## Logging
### Creating a Logger Factory

Before you can begin logging, you must first create a new Logger factory function for your application:

```javascript
import logger from '@springforcreators/logger';

const getLogger = logger.createFactory(config); // config is optional; see customization
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
  success: 3, // report final process output before exit
  verbose: 4, // noisy version of info; print object properties, configs, etc.
  debug: 5,   // information to help troubleshoot issues; ex. error stack traces
  silly: 6    // trace level information, should probably be removed before merge into dev/prod
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

Customize the logging factory by passing in an object to the `logger.createFactory` function with the following properties:

- `name`: Name to prepend to each log statement. Defaults to `Service`.
- `meta`: Object containing arbitrary information to include along every log message. See [winston documentation](https://github.com/winstonjs/winston#streams-objectmode-and-info-objects) for details.
- `testLevel`: Determines the lowest priority allowed during a test run. Defaults to `'error'`.
- `delimiter`: Delimiter between the name and the log message. Defaults to `>>`.
- `middleware`: Middleware to apply to log statements before they are written. See [middleware](#middleware) section for details.
- `format`: The format style for the log statement Options are `simple|json`. Defaults to `'simple'`. For more on JSON style formatting, see [the JSON formatting](#json-formatting) section for details.

#### Instance Configuration

Likewise, logger instances can be configured by passing in an object to the factory function with the following properties:

- `name`: Optional name of the logger instance. Used to identify log messages generated from specific modules in your application.

  ```javascript
  const getLogger = logger.createFactory({ name: "Orders Service" });
  const log = getLogger({ name: "Orders Client" });

  // [info] Orders Service >> Orders Client >> All systems go!
  log.info("All systems go!");
  ```

### Middleware

Middleware functions allow you to transform log messages before they are written to the stream. You can add middleware by passing in a list to the factory configuration:

```javascript
const redactSecrets = (context, next) => {
  //
  // context parameter provides:
  // - options: current logger instance options
  // - config: current logger factory config
  // - args: the list of arguments passed into the log function
  // - level: the log message level
  //
  const { options, config, args, level } = context;
  args.forEach(arg => {
    if (arg.hasOwnProperty('secret')) {
      arg['secret'] = '********'
    }
  });
  // Call the next function in order for other middleware to be executed
  // in the pipeline.
  next();
};

const deepCopy = (context, next) => {
  // Use Lodash to deep clone and prevent side effects
  context.args = _.cloneDeep(context.args);
  next();
};

const getLogger = logger.createFactory({ name: "Example", middleware: [deepCopy, redactSecrets] });
const log = getLogger();

// [info] Example >> Received data: { foo: "bar", secret: "********" }
log.info("Received data: ", { foo: "bar", secret: "my-secret" });
```

Middleware functions are called in the order they are discovered in the array, from first to last, or until
a middleware function does not call `next()` before exiting.

### JSON Formatting

In order to take advantage of the [JSON style filtering and metric queries on AWS Cloudwatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html), log statements must be serialized as JSON objects. You can enable JSON formatting by setting the format in the factory configuration:

```javascript
const getLogger = logger.createFactory({ name: "My Service", format: "json" });
const log = getLogger( name: "someModule", meta: { context1: "one", context2: "two" });
log.info("This is a JSON style log statement", { value: 7 });
```

The output is then serialized to JSON:

```json
{
  "level": "info",
  "label": "My Service",
  "message": "This is a JSON style log statement",
  "data": {
    "value": 7
  },
  "instance": "someModule",
  "context1": "one",
  "context2": "two",
  "timestamp":  "2021-05-27T21:10:23.680Z",
  "ms": "+0ms"
}
```

Note that any valid javascript object after the initial log message is serialized under the `data` property. If the first parameter is an object or array, that
data will be serialized under the `message` property. Any metadata is presented as a direct child of the root object. Splat based formatting (ex, `%s`) is **not supported** by the JSON style; if you want to log multiple objects within a single statement, place them within an array for the second argument.

```javascript
log.info("Logging multiple items", [{ foo: "bar" }, { bar: "baz" }]);
```

> The `ms` property is the amount of time passed since the last log message and the current statement.

## How to Contribute

- Please see the [repository README](/README.md) for how to contribute as a developer, bug reporter, or maintainer.
- The logger library uses TSDX to manage configuration, builds, and publishing. If you plan on contributing as a developer, check out TSDX's documentation [here](https://tsdx.io).

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
