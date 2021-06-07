import winston, { Logger, Container } from 'winston';
import { createBase } from './base';
import { ContainerOptions, ContainerOptionsPrivate } from './types/config';

// winston log configuration set levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5,
};

export interface CreateProfileResult {
  container: Container;
  /** Gets the default category of the lambda logger container. */
  getLogger: (options?: Record<string, unknown>) => Logger;
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

  // create default category
  const container = new Container();
  const logger = container.add('default', {
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
    container,
    getLogger: options => logger.child({ ...options }),
  };
}
