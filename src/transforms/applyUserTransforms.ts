import _isString from 'lodash/isString';
import winston, { format, Logform } from 'winston';
import { ContainerOptionsPrivate } from '../types/config';

type TransformableInfo = winston.Logform.TransformableInfo;

/** Extacted log context information. */
export type ExtractedInfo = {
  /** String interpolation splat for %d %s-style messages. */
  splat: unknown[];
  /** Log message; could be a string or object. */
  message: unknown;
};

/**
 * Options passed into a user transform function when it is invoked.
 */
export interface UserTransformOptions extends Record<string, unknown> {
  /**
   * Extracts contextual information from the info object.
   *
   * @param info The winston log message context.
   * @return {@link ExtractedInfo} object containing the context.
   */
  unpack: (info: TransformableInfo) => ExtractedInfo;

  /**
   * Saves the specified data to the info object.
   *
   * @param info The winston log message context.
   * @param extracted The extracted {@link ExtractedInfo} object obtained from
   * unpacking.
   */
  pack: (info: TransformableInfo, extracted: Partial<ExtractedInfo>) => void;
}

/**
 * A function that can manupulate log information before it is sent to a transport.
 * 
 * @param info The winston log message context.
 * @param opts Optional function parameters.
 * @returns A falsey value, or the log message context.
*/
export type UserTransformFunction = (
  info: TransformableInfo,
  opts: UserTransformOptions
) => boolean | TransformableInfo;

/** Gets the symbol object refrenced by the specified key. */
const symbol = (key: string): string => {
  const symbol: unknown = Symbol.for(key);
  return symbol as string;
};

/** Gets the splat data from the information object. */
const splat = (info: TransformableInfo): unknown[] => {
  const args = info[symbol('splat')] as unknown[];
  return args ?? [];
};

/** Typescript helper function to set the message property of an info object to any values. */
const setMessage = (info: Record<string, unknown>, value: unknown): void => {
  info.message = value;
};

/**
 * Creates a new options object to pass into user transform functions.
 *
 * @param props The transform options provided by the user configuration.
 * @returns A new instance of {@link UserTransformOptions}.
 */
const createTransformOptions = (props: Record<string, unknown>): UserTransformOptions => ({
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
});

/**
 * Combines the user specified log transformation functions that will be applied
 * to an info object at log time.
 *
 * @param opts User configuration options.
 * @returns A winston log format function to pass into a winston transport formatter.
 */
export const applyUserTransforms = (opts: ContainerOptionsPrivate): Logform.Format => {
  const { transforms } = opts;
  const transformOpts = createTransformOptions(opts.transformOpts);
  const formats = transforms.map(format).map(wrapped => wrapped(transformOpts));
  return format.combine(...formats);
};
