import { Logger, Logform, config, transport } from 'winston';

export type TransportRecord = Record<string, transport>;

type OptionsBase = Record<string, unknown>;

export interface CreateTransportOptions extends OptionsBase {}

export interface SelectTransportOptions extends OptionsBase {
  record: TransportRecord;
}

export interface SelectColorOptions extends OptionsBase {}

export interface LoggerCreatedOptions extends OptionsBase {
  colors: config.AbstractConfigSetColors;
  levels: config.AbstractConfigSetLevels;
  logger: Logger;
}

export interface LogFormatOptions extends OptionsBase {
  info: Logform.TransformableInfo;
}

type ContainerEventHook<T, U = void> = (options: T) => U;

export interface ContainerEventHooks {
  onCreateTransports: ContainerEventHook<
    CreateTransportOptions,
    TransportRecord
  >;
  onSelectTransports: ContainerEventHook<SelectTransportOptions, transport[]>;
  onSelectColors: ContainerEventHook<
    SelectColorOptions,
    config.AbstractConfigSetColors
  >;
  onLoggerCreated: ContainerEventHook<LoggerCreatedOptions>;
  onLogFormat: ContainerEventHook<LogFormatOptions, string>;
}

export type ContainerEventHooksProvider = (
  base: ContainerEventHooks
) => Partial<ContainerEventHooks>;
