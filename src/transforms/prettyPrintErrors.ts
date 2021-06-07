import _isError from 'lodash/isError';
import { UserTransformFunction } from './types';
import _isArray from 'lodash/isArray';

export interface PrettyPrintErrorsOptions {
  /** The function that invokes the VError::info function on the specified error message. */
  vErrorInfoFunc?: (error: Error) => Record<string, unknown>;
}

function transform(arg: unknown, opts: PrettyPrintErrorsOptions): unknown {
  return _isError(arg)
    ? {
        message: arg.message,
        info: opts.vErrorInfoFunc?.call(null, arg),
        stack: arg.stack?.split('\n'),
      }
    : arg;
}

/**
 * Attempts to transform error objects info a more readable format by splitting up stack strings.
 * Supports verror library error objects.
 *
 * @param params The transform options.
 * @returns A user transform function to add to the user configuration.
 */
export const prettyPrintErrorTransform = (params: PrettyPrintErrorsOptions): UserTransformFunction => {
  return (info, opts) => {
    const { message, splat } = opts.unpack(info);
    if (splat.length === 0 && _isArray(message)) {
      // try to transform error object
      const error = message[0];
      if (_isError(error)) {
        info.message = error.message;
        opts.pack(info, { splat: [transform(error, params)] });
      }
    } else {
      // arguments might contain error objects; try to transform them.
      opts.pack(info, {
        message: info.message,
        splat: splat.map(arg => ({ error: transform(arg, params) })),
      });
      info.stack = undefined;
    }
    return info;
  };
};
