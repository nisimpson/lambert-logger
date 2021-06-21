import { Logger, Container } from 'winston';
import { createBaseHooks } from './hooks';
import { LoggerContainerOptions } from './types';

export interface CreateProfileResult {
  /** Gets the default logger. */
  logger: Logger;
  /** Gets the default category of the lambda logger container. */
  getLogger: (name?: string, options?: Record<string, unknown>) => Logger;
}

/** User container configuration options. */
export type CreateOptions = Partial<LoggerContainerOptions>;

// winston log configuration set levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5,
};

/**
 * Creates a new logger and transports for AWS lambda logging.
 *
 * @param opts The user configuration options.
 * @returns An object containing the cloudwatch container and a logger factory function.
 */
export function create(opts: CreateOptions = {}): CreateProfileResult {
  const options: LoggerContainerOptions = {
    // default options
    name: '',
    delimiter: '|',
    testLevel: 'error',
    defaultMeta: {},
    transforms: [],
    transformOpts: {},
    hooks: undefined,

    // merge with user options
    ...opts,
  };

  const baseHooks = createBaseHooks(options);

  // use hooks to build and configure logger
  const hooks = options.hooks
    ? {
        ...baseHooks,
        ...options.hooks(baseHooks),
      }
    : baseHooks;

  // create logger transports (console, http, file, etc.)
  const record = hooks.onCreateTransports({});
  const [...transports] = hooks.onSelectTransports({ record });

  // create default category
  const logger = new Container().add('default', {
    levels,
    transports,
    defaultMeta: options.defaultMeta,
  });

  // adjust/view logger
  hooks.onLoggerCreated({
    levels,
    logger,
  });

  return {
    logger,
    getLogger: (name, options) => logger.child({ ...options, instance: name }),
  };
}
