import { ContainerEventHooks } from './types/hooks';
import { ContainerOptionsPrivate } from './types/config';
import { transports, format, Logform } from 'winston';
import _omitBy from 'lodash/omitBy';
import _isUndefined from 'lodash/isUndefined';
import _isEmpty from 'lodash/isEmpty';
import { applyUserTransforms } from './transforms/apply';

const { STAGE, AWS_EXECUTION_ENV, NODE_ENV, CI, LOGGER_DEBUG } = process.env;

const { combine, label, printf, splat } = format;

/** Format transform. Removes all undefined properties from the metadata object. */
const omitUndefined = format(info => {
  info.metadata = _omitBy(info.metadata, _isUndefined);
  return info;
});

/**
 * Format transform. Wraps non specified metadata into a single object, 'rest', within the
 * metadata object.
 */
const stringifyRest = format((info, opts) => {
  const { label, timestamp, instance, ...rest } = info.metadata;
  const { indent } = opts;
  info.metadata.rest = _isEmpty(rest) ? undefined : JSON.stringify({ ...rest }, null, indent);
  return info;
});

/**
 * Format transform. Prints representation of info object to the console. For development use
 * only.
 */
const printInfoToConsole = format(info => {
  if (LOGGER_DEBUG) {
    console.log('Log info:');
    console.log(info);
  }
  return info;
});

type Formatter = (opts: ContainerOptionsPrivate, hooks: ContainerEventHooks) => Logform.Format;

/** Console formatter used for AWS cloudwatch logs. */
const cloudwatchFormat: Formatter = (opts, hooks) =>
  combine(
    ...[
      applyUserTransforms(opts),
      splat(),
      label({ label: opts.name }),
      format.metadata(),
      omitUndefined(),
      stringifyRest({ indent: 0 }),
      printInfoToConsole(),
      printf(info => hooks.onLogFormat({ info })),
    ]
  );

/** Console formatter used for local development, aka terminal console. */
const localFormat: Formatter = (opts, hooks) =>
  combine(
    ...[
      applyUserTransforms(opts),
      splat(),
      label({ label: opts.name }),
      format.timestamp(),
      format.metadata(),
      omitUndefined(),
      stringifyRest({ indent: 2 }),
      printInfoToConsole(),
      format.colorize(),
      printf(info => hooks.onLogFormat({ info })),
    ]
  );

/**
 * Creates the base functionality hooks for this logger container.
 *
 * @param opts The container configuration options.
 * @returns A new {@link ContainerEventHooks} object for use in building the container.
 */
export const createBase = (opts: ContainerOptionsPrivate): ContainerEventHooks => {
  const result: ContainerEventHooks = {
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
          level: 'silly',
          handleExceptions: true,
          format: localFormat(opts, this),
        }),
      };
    },

    onSelectColors: () => ({
      error: 'redBG black',
      warn: 'yellowBG black',
      info: 'whiteBG black',
      success: 'greenBG black',
      verbose: 'blueBG black',
      debug: 'magentaBG black',
      silly: 'greenBG black',
    }),

    onSelectTransports: ({ record }) => {
      // If running on AWS...
      if (AWS_EXECUTION_ENV) {
        switch (STAGE) {
          case 'prod':
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

      // Silence the logger for test environments in CI
      if (CI && NODE_ENV === 'test') {
        logger.silent = true;
      }
    },

    // something like:
    // [info][2021-06-05T15:47:10.591Z] Logger Name >> Hello, World! >> {some:'metadata'}
    onLogFormat: ({ info }) => {
      const { label, instance, timestamp, rest } = info.metadata;
      const header = timestamp
        ? `[${info.level}][${timestamp}] ${label} ${opts.delimiter}`
        : `[${info.level}] ${label} ${opts.delimiter}`;
      const message = instance
        ? `${header} ${instance} ${opts.delimiter} ${info.message}`
        : `${header} ${info.message}`;
      return rest ? `${message} ${opts.delimiter} ${rest}` : message;
    },
  };
  return result;
};
