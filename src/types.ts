import { config, Logform, Logger, transport } from 'winston';
import { UserTransformFunction } from './transforms/types';

export interface Levels<Type> {
  error: Type;
  warn: Type;
  info: Type;
  verbose: Type;
  debug: Type;
  silly: Type;
}

/** A key/value pair of strings to associated winston Transport instances. */
export type TransportRecord = Record<string, transport>;

type OptionsBase = Record<string, unknown>;

/** Create transport event hook options. */
export interface CreateTransportOptions extends OptionsBase {}

/** Select transport event hook options. */
export interface SelectTransportOptions extends OptionsBase {
  /** The record of transports created by the onCreateTransport hook. */
  record: TransportRecord;
}

/** Logger created event hook options. */
export interface LoggerCreatedOptions extends OptionsBase {
  levels: config.AbstractConfigSetLevels;
  logger: Logger;
}

/** Log format event hook options. */
export interface LogFormatOptions extends OptionsBase {
  /**
   * The finalized info object. Contains level, message, and metadata properties.
   */
  info: Logform.TransformableInfo;
}

type LoggerEventHook<T, U = void> = (options: T) => U;

/** A set of function that are invoked during specific events within the logger's lifetime. */
export interface LoggerEventHooks {
  /**
   * Invoked when the container builds transport objects to be used by the logger.
   *
   * @param options the event hook options.
   * @returns A transport record, containing one or more transport instances.
   */
  onCreateTransports: LoggerEventHook<CreateTransportOptions, TransportRecord>;
  /**
   * Invoked when the container requests a collection of transports to be used by the logger.
   *
   * @param options the event hook options.
   * @returns A collection of transport instances to be passed into the logger.
   */
  onSelectTransports: LoggerEventHook<SelectTransportOptions, transport[]>;

  /**
   * Invoked when the logger has been created and added to the container. This logger and
   * its children will be provided via both the container and the getLogger factory function.
   *
   * @param options the event hook options.
   */
  onLoggerCreated: LoggerEventHook<LoggerCreatedOptions>;
  /**
   * Invoked when the logger has applied all transforms, and will write to the target log level
   * and transform.
   *
   * @param options the event hook options.
   * @returns The string that will be written to the log.
   */
  onLogFormat: LoggerEventHook<LogFormatOptions, string>;
}

/**
 * Provider for custom event hooks that can override or extend base behavior.
 *
 * @example
 * const custom = (base) => ({
 *  onSelectColors: (options) => {
 *    const colors = base.onSelectColors(options);
 *    return {
 *      ...colors,
 *      silly: 'blueBG black'
 *    };
 *  };
 * });
 *
 * @param base The event hook container for the default configuration.
 */
export type LoggerEventHooksProvider = (base: LoggerEventHooks) => Partial<LoggerEventHooks>;

/** User container configuration options. */
export interface LoggerContainerOptions {
  /** The logger name. Defaults to 'Service'. */
  name: string;
  /** Characters to use between log message items. Defaults to '>>'. */
  delimiter: string;
  /** Base level to appear during unit testing. Defaults to 'silly'. */
  testLevel: string;
  /** Key/value pair of properties to be printed with every log message. */
  defaultMeta: Record<string, unknown>;
  /** A collection of user transforms to manuplate log messages before they are written. */
  transforms: UserTransformFunction[];
  /** Custom options accessible to all user transforms in the transforms list when provoked. */
  transformOpts: Record<string, unknown>;
  /** Custom hooks used to extend or override base container functionality. Advanced use only. */
  hooks: LoggerEventHooksProvider | undefined;
}
