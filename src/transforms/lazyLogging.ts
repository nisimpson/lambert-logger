import _isFunction from 'lodash/isFunction';
import { UserTransformFunction } from './types';

export function lazyLogTransform(): UserTransformFunction {
  return (info, opts) => {
    // check if message is a function
    const { message } = opts.unpack(info);
    if (_isFunction(message)) {
      const [format, ...rest] = message();
      opts.pack(info, { message: format, splat: rest });
    }
    return info;
  };
}
