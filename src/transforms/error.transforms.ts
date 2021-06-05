import _isError from 'lodash/isError';
import { UserTransformFunction } from './config.transforms';
import _isArray from 'lodash/isArray';

export interface PrettyPrintErrorsOptions {
  vErrorInfoFunc: (error: Error) => Record<string, unknown>;
}

function transform(arg: unknown, opts: PrettyPrintErrorsOptions): unknown {
  return _isError(arg)
    ? {
        message: arg.message,
        info: opts.vErrorInfoFunc(arg),
        stack: arg.stack?.split('\n'),
      }
    : arg;
}

export const prettyPrintErrors = (params: PrettyPrintErrorsOptions): UserTransformFunction => {
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
