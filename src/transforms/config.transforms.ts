import _isString from 'lodash/isString';
import winston from 'winston';

type TransformableInfo = winston.Logform.TransformableInfo;

export type ExtractedInfo = {
  splat: unknown[];
  message: unknown;
};

export interface UserTransformOptions extends Record<string, unknown> {
  unpack: (info: TransformableInfo) => ExtractedInfo;
  pack: (info: TransformableInfo, extracted: Partial<ExtractedInfo>) => void;
}

export type UserTransformFunction = (
  info: TransformableInfo,
  opts: UserTransformOptions
) => boolean | TransformableInfo;

const symbol = (key: string): string => {
  const symbol: unknown = Symbol.for(key);
  return symbol as string;
};

const splat = (info: TransformableInfo): unknown[] => {
  const args = info[symbol('splat')] as unknown[];
  return args ?? [];
};

const setMessage = (info: Record<string, unknown>, value: unknown): void => {
  info.message = value;
};

export function createTransformOptions(props: Record<string, unknown>): UserTransformOptions {
  return {
    ...props,
    unpack: info => ({
      splat: splat(info),
      message: info.message,
    }),
    pack: (info, extracted) => {
      const { message, splat } = extracted;
      if (splat) {
        info[symbol('splat')] = splat;
      }
      if (message) {
        setMessage(info, message);
      }
    },
  };
}
