import { ContainerEventHooksProvider } from './hooks';
import { UserTransformFunction } from './transforms';

export interface ContainerOptionsPrivate {
  name: string;
  delimiter: string;
  testLevel: string;
  defaultMeta: Record<string, unknown>;
  transforms: UserTransformFunction[];
  transformOpts: Record<string, unknown>;
  hooks: ContainerEventHooksProvider | undefined;
}

export type ContainerOptions = Partial<ContainerOptionsPrivate>;
