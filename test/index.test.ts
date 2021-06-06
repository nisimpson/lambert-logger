import winston from 'winston';
import VError from 'verror';
import { create } from '../src/container';
import { prettyPrintErrors, UserTransformFunction } from '../src/transforms';

describe('winston cloudwatch container', () => {
  test('simple log', () => {
    const container = new winston.Container();
    const { getLogger } = create(container, { name: 'cloudwatch', defaultMeta: { one: 'two' } });
    const logger = getLogger({ two: 'three' });
    logger.info('Testing!');
    logger.warn('Testing %s?', '1 2 3');
    logger.warn('Testing?', { foo: 'bar', arr: ['1 2 3'] });
  });

  test('user transforms', () => {
    const addFoo: UserTransformFunction = (info, opts) => {
      const { splat } = opts.unpack(info);
      splat.push({ foo: 'yes!' });
      opts.pack(info, { splat });
      return info;
    };

    const container = new winston.Container();
    const { getLogger } = create(container, { name: 'transforms', transforms: [addFoo] });
    const logger = getLogger();
    logger.info('Is there a foo?');
    logger.success('Is there a %s?', 'foo');
  });

  test('pretty print error transform', () => {
    const container = new winston.Container();
    const { getLogger } = create(container, {
      name: 'pretty print errors',
      transforms: [prettyPrintErrors({ vErrorInfoFunc: err => VError.info(err) })],
    });
    const logger = getLogger();
    logger.error('no error');
    logger.error([new Error('wrapped error')]);
    logger.error([new VError(new Error('cause'), 'wrapped with a cause')]);
    logger.error('Some message text first', new Error('with an error splat'));
    logger.error([new VError({ name: 'MockError', info: { foo: 'bar' } }, 'Mocked')]);
  });
});
