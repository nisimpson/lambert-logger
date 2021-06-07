import { LoggerEventHooksProvider } from './hooks';
import { UserTransformFunction } from '../transforms';

/** User container configuration options. */
export interface ContainerOptionsPrivate {
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

/** User container configuration options. */
export type ContainerOptions = Partial<ContainerOptionsPrivate>;
