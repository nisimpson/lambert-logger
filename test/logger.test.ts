import VError from 'verror';
import unit, { UserTransformFunction, lazyLogTransform, prettyPrintErrorTransform } from '../src';

describe('winston lambda logger', () => {
  test('simple log', () => {
    const { getLogger } = unit.create({ name: 'lambda', defaultMeta: { one: 'two' }, testLevel: 'debug' });
    const logger = getLogger('child-logger', { two: 'three' });
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

    const { getLogger } = unit.create({ name: 'transforms', transforms: [addFoo], testLevel: 'debug' });
    const logger = getLogger();
    logger.info('Is there a foo?');
    logger.verbose('Is there a %s?', 'foo');
  });

  test('pretty print error transform', () => {
    const { getLogger } = unit.create({
      name: 'pretty print errors',
      transforms: [prettyPrintErrorTransform({ vErrorInfoFunc: err => VError.info(err) })],
      testLevel: 'debug'
    });
    const logger = getLogger();
    logger.error('no error');
    logger.error([new Error('wrapped error')]);
    logger.error([new VError(new Error('cause'), 'wrapped with a cause')]);
    logger.error('Some message text first', new Error('with an error splat'));
    logger.error([new VError({ name: 'MockError', info: { foo: 'bar' } }, 'Mocked')]);
  });

  test('lazy log transform', () => {
    const { getLogger } = unit.create({
      name: 'lazy log',
      transforms: [lazyLogTransform()],
      testLevel: 'debug',
    });
    const logger = getLogger();
    const someFunction = jest.fn().mockReturnValue('Some string');
    expect(logger.level).toBe('debug');
    logger.debug(() => ['This is a lazy log']);
    logger.debug(() => ['This is %s', 'also a lazy log']);
    logger.silly(() => ['This log wont show up, though. The function also wont get invoked.', someFunction()]);
    expect(someFunction).not.toBeCalled();
  });

  test('log level override', () => {
    process.env.LOGGER_LEVEL = 'warn';
    const { logger } = unit.create({
      name: 'Log Override',
      testLevel: 'debug'
    });
    logger.debug("You can't see this.");
    logger.warn("But you can see this.");
  })
});
