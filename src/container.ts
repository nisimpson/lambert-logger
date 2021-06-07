import winston from 'winston';
import { createBase } from './base';
import { ContainerOptions, ContainerOptionsPrivate } from './types/config';

// winston log configuration set levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  success: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

type CustomLogger = Record<keyof typeof levels, winston.LeveledLogMethod>;

/** Winston logger suited for generating Cloudwatch log messages from AWS Lambda functions. */
export type CloudwatchLogger = winston.Logger & CustomLogger;

export interface CreateProfileResult {
  /** Gets the default instance of the Cloudwatch logger. */
  getLogger: (options?: Record<string, unknown>) => CloudwatchLogger;
}

/**
 * Creates a new logger and transports for AWS lambda logging.
 *
 * @param opts The user configuration options.
 * @returns An object containing the cloudwatch container and a logger factory function.
 */
export function create(opts: ContainerOptions = {}): CreateProfileResult {
  const options: ContainerOptionsPrivate = {
    // default options
    name: '',
    delimiter: '>>',
    testLevel: 'silly',
    defaultMeta: {},
    transforms: [],
    transformOpts: {},
    hooks: undefined,

    // merge with user options
    ...opts,
  };

  const base = createBase(options);

  // use hooks to build and configure logger
  const hooks = options.hooks
    ? {
        ...base,
        ...options.hooks(base),
      }
    : base;

  const colors = hooks.onSelectColors({});
  winston.addColors(colors);

  // create logger transports (console, http, file, etc.)
  const record = hooks.onCreateTransports({});
  const [...transports] = hooks.onSelectTransports({ record });

  const container = new winston.Container();

  // create default category
  const logger = container.add('lambda', {
    levels,
    transports,
    defaultMeta: options.defaultMeta,
  });

  // adjust/view logger
  hooks.onLoggerCreated({
    levels,
    colors,
    logger,
  });

  return {
    getLogger: options => container.get('lambda').child({ ...options }) as CloudwatchLogger,
  };
}
