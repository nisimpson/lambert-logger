import winston from 'winston';
import { createBase } from './base';
import { ContainerOptions, ContainerOptionsPrivate } from './config';

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

export type CloudwatchLogger = winston.Logger & CustomLogger;

export interface CreateLoggerResult {
  container: winston.Container;
  getLogger: (options?: Record<string, unknown>) => CloudwatchLogger;
}

export function create(opts: ContainerOptions = {}): CreateLoggerResult {
  const container = new winston.Container();

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
  const logger = container.add('default', {
    levels,
    transports,
    defaultMeta: options.defaultMeta
  });

  // adjust/view logger
  hooks.onLoggerCreated({
    levels,
    colors,
    logger,
  });

  return {
    getLogger: options => container.get('default').child({ ...options }) as CloudwatchLogger,
    container,
  };
}
