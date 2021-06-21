import chalk, { Chalk } from 'chalk';
import _isArray from 'lodash/isArray';
import _isEmpty from 'lodash/isEmpty';
import _isUndefined from 'lodash/isUndefined';
import _omitBy from 'lodash/omitBy';
import { createLogger, format, Logform, transports } from 'winston';
import { applyUserTransforms } from './transforms/applyUserTransforms';
import { Levels, LoggerContainerOptions, LoggerEventHooks } from './types';

type Formatter = (opts: LoggerContainerOptions, hooks: LoggerEventHooks) => Logform.Format;

const { combine, label, printf, splat } = format;

const internal = createLogger({
  silent: true,
  level: 'debug',
  transports: [
    new transports.Console({
      format: combine(splat(), format.simple()),
    }),
  ],
});

const debug = (message: string, ...meta: unknown[]) => internal.debug(chalk.red(message), meta);

const allowInternalLogging = format((info, opts) => {
  if (opts.enabled) {
    internal.silent = false;
    debug('Logger debug active');
  }
  return info;
});

/** Format transform. Removes all undefined properties from the metadata object. */
const stripUndefinedKeys = format(info => {
  debug('begin strip undefined keys');
  debug('info before: %o', info);
  info.metadata = _omitBy(info.metadata, _isUndefined);
  debug('info after: %o', info);
  return info;
});

/**
 * Format transform. Wraps non specified metadata into a single object, 'rest', within the
 * metadata object.
 */
const stringifyMetadata = format((info, opts) => {
  debug('begin stringify metadata');
  const { indent, enabled } = opts;
  if (enabled) {
    debug('info before: %o', info);
    const { label, timestamp, instance, ...rest } = info.metadata;
    info.metadata.rest = _isEmpty(rest) ? undefined : JSON.stringify({ ...rest }, null, indent);
    debug('info after: %o', info);
  }
  debug('end stringify metadata');
  return info;
});

/**
 * Format transform. Creates JSON structured output for cloudwatch logging.
 */
const formatAsJson = format((info, opts) => {
  if (opts.enabled) {
    const { label, instance, ...rest } = info.metadata;
    info.formatted = JSON.stringify({
      level: info.level,
      service: instance ? `${label}.${instance}` : label,
      message: info.message,
      metadata: { ...rest },
    });
  }
  return info;
});

/**
 * Format transform. Creates output for use on terminal.
 */
const formatStandard = format((info, opts) => {
  if (opts.enabled) {
    const bold = chalk.bold;
    const colors: Levels<Chalk> = {
      error: bold.red,
      warn: bold.keyword('orange'),
      info: bold.blue,
      verbose: bold.green,
      debug: bold.green,
      silly: bold.keyword('purple'),
    };

    const { label, instance, timestamp, rest } = info.metadata;

    // set log level color
    const color = colors[info.level as keyof Levels<Chalk>];

    // add formatting
    const formatted: Record<string, string> = {};
    formatted.level = color(`${info.level.toUpperCase()}`);
    formatted.delimiter = chalk.yellow(opts.delimiter);
    formatted.label = instance ? chalk.yellow(`${label}[${instance}]:`) : chalk.yellow(`${label}:`);
    formatted.header = timestamp
      ? [chalk.yellow(timestamp), formatted.level, formatted.label].join(formatted.delimiter)
      : [formatted.level, formatted.label].join(formatted.delimiter);
    formatted.message = rest ? `${info.message} ${rest}` : `${info.message}`;

    // 2021-06-05T15:47:10.591Z | DEBUG | Logger Name: Hello, World! {some:'metadata'}
    info.formatted = `${formatted.header} ${formatted.message}`;
  }
  return info;
});

/** Console formatter used for AWS cloudwatch logs. */
const cloudwatchFormat: Formatter = (opts, hooks) =>
  combine(
    ...[
      applyUserTransforms(opts),
      splat(),
      label({ label: opts.name }),
      format.metadata(),
      stripUndefinedKeys(),
      formatAsJson({ enabled: true }),
      printf(info => hooks.onLogFormat({ info })),
    ]
  );

/** Console formatter used for local development, aka terminal console. */
const localFormat: Formatter = (opts, hooks) =>
  combine(
    ...[
      allowInternalLogging({ enabled: process.env.LOGGER_DEBUG }),
      applyUserTransforms(opts),
      splat(),
      label({ label: opts.name }),
      format.timestamp(),
      format.metadata(),
      stripUndefinedKeys(),
      stringifyMetadata({ enabled: true, indent: 2 }),
      formatStandard({ enabled: true, delimiter: opts.delimiter }),
      printf(info => hooks.onLogFormat({ info })),
    ]
  );

/**
 * Creates the base functionality hooks for this logger container.
 *
 * @param opts The container configuration options.
 * @returns A new {@link ContainerEventHooks} object for use in building the container.
 */
export const createBaseHooks = (opts: LoggerContainerOptions): LoggerEventHooks => {
  const { AWS_EXECUTION_ENV, NODE_ENV, CI, LOGGER_LEVEL } = process.env;
  const result: LoggerEventHooks = {
    onCreateTransports(_options) {
      return {
        // production code: minimal, informational, warning, and error logging
        production: new transports.Console({
          level: 'success',
          handleExceptions: true,
          format: cloudwatchFormat(opts, this),
        }),
        // development code: noisy, shows object payloads during flows, stack traces for troubleshooting
        development: new transports.Console({
          level: 'debug',
          handleExceptions: true,
          format: cloudwatchFormat(opts, this),
        }),
        // noisiest, anything goes style logging
        local: new transports.Console({
          handleExceptions: true,
          format: localFormat(opts, this),
        }),
      };
    },

    onSelectTransports: ({ record }) => {
      // If running on AWS...
      if (AWS_EXECUTION_ENV) {
        switch (NODE_ENV) {
          case 'production':
            // ...only send high priority logs
            return [record.production];
          default:
            // ...send most log levels
            return [record.development];
        }
      }
      return [record.local];
    },

    onLoggerCreated: ({ logger }) => {
      // Set threshold for logging during test scenarios
      if (NODE_ENV === 'test') {
        logger.level = opts.testLevel;
      }

      if (LOGGER_LEVEL && LOGGER_LEVEL !== '') {
        logger.transports.forEach(transport => (transport.level = undefined));
        logger.level = LOGGER_LEVEL;
      }

      // Silence the logger for test environments in CI
      if (CI && NODE_ENV === 'test') {
        logger.silent = true;
      }
    },

    // something like:
    // [info][2021-06-05T15:47:10.591Z] Logger Name >> Hello, World! >> {some:'metadata'}
    onLogFormat: ({ info }) => info.formatted,
  };
  return result;
};
