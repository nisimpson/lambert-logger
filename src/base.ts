import { ContainerEventHooks } from './hooks';
import { ContainerOptionsPrivate } from './config';
import { transports, format, Logform } from 'winston';
import { isEmpty } from 'lodash';
import { createTransformOptions } from './transforms/config.transforms';

const { STAGE, AWS_EXECUTION_ENV, NODE_ENV, CI } = process.env;

const { combine, label, printf, splat } = format;

type Formatter = (opts: ContainerOptionsPrivate, hooks: ContainerEventHooks) => Logform.Format;

const applyUserTransforms = (opts: ContainerOptionsPrivate): Logform.Format => {
  const { transforms } = opts;
  const transformOpts = createTransformOptions(opts.transformOpts);
  const formats = transforms.map(transform => format(transform)(transformOpts));
  return combine(...formats);
};

const stringifyMetadata = format((info, opts) => {
  const { timestamp, instance, ...rest } = info.metadata;
  info.metadata.rest = isEmpty(rest) ? undefined : JSON.stringify({ ...rest }, null, opts.space || 0);
  return info;
});

const cloudwatchFormat: Formatter = (opts, hooks) =>
  combine(
    ...[
      applyUserTransforms(opts),
      splat(),
      format.metadata(),
      label({ label: opts.name }),
      stringifyMetadata(),
      printf(info => hooks.onLogFormat({ info })),
    ]
  );

const localFormat: Formatter = (opts, hooks) =>
  combine(
    ...[
      applyUserTransforms(opts),
      splat(),
      format.timestamp(),
      format.metadata(),
      label({ label: opts.name }),
      stringifyMetadata({ space: 2 }),
      format.colorize(),
      printf(info => hooks.onLogFormat({ info })),
    ]
  );

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

    onLogFormat: ({ info }) => {
      const { instance, timestamp, rest } = info.metadata;
      const header = timestamp
        ? `[${info.level}][${timestamp}] ${info.label} ${opts.delimiter}`
        : `[${info.level}] ${info.label} ${opts.delimiter}`;
      const message = instance
        ? `${header} ${instance} ${opts.delimiter} ${info.message}`
        : `${header} ${info.message}`;
      return rest ? `${message} ${opts.delimiter} ${rest}` : message;
    },
  };
  return result;
};
