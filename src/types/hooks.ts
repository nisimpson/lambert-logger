import { Logger, Logform, config, transport } from 'winston';

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

/** Color selection event hook options. */
export interface SelectColorOptions extends OptionsBase {}

/** Logger created event hook options. */
export interface LoggerCreatedOptions extends OptionsBase {
  colors: config.AbstractConfigSetColors;
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
   * Invoked when the container requests foreground/background colors associated with
   * each log level.
   *
   * @param options the event hook options.
   * @returns An object containing the log level colors.
   */
  onSelectColors: LoggerEventHook<SelectColorOptions, config.AbstractConfigSetColors>;
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
