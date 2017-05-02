jest.mock('ioredis', () => require('ioredis-mock').default);

const cacheFactory = require('../cache');

let cache;
beforeAll(() => cacheFactory()
    .then(c => {
      cache = c;
      return Promise.resolve();
    })
);

beforeEach(() => cache.clearAll());

describe('.access(msgId, args, getResult)', () => {
  it(`Caches result and runs 'getResult' only once.`, () => {
    const cb = jest.fn((args) => args.foo);
    return cache.access(
      '1234',
      { foo: 'bar' },
      cb
    ).then(result => {
      expect(cb).toHaveBeenCalledTimes(1);
      expect(result).toBe('bar');
    }).then(() => {
      const newCb = jest.fn((args) => 'wrong');
      cache.access(
        '1234',
        { foo: 'bar' },
        newCb
      ).then(result => {
        expect(newCb).not.toHaveBeenCalled();
        expect(result).toBe('bar');
      });
    });
  });

  it(`Caches result and runs 'getResult' only once, resolves Promises returned by
      'getResult'.`, () => {
    const cb = jest.fn((args) => Promise.resolve(args.bar));
    return cache.access(
      'foo',
      { bar: 'baz' },
      cb
    ).then(result => {
      expect(cb).toHaveBeenCalledTimes(1);
      expect(result).toBe('baz');
    }).then(() => {
      const newCb = jest.fn((args) => Promise.resolve('wrong'));
      cache.access(
        'foo',
        { bar: 'baz' },
        newCb
      ).then(result => {
        expect(newCb).not.toHaveBeenCalled();
        expect(result).toBe('baz');
      });
    });
  });

  it(`Calls toString on result before returning and storing result.`, () => {
    const cb = jest.fn((args) => Promise.resolve(args));
    const args = { bar: 'baz' };
    return cache.access(
      'foo',
      args,
      cb
    ).then(result => {
      expect(cb).toHaveBeenCalledTimes(1);
      expect(result).toBe(args.toString());
    }).then(() => {
      const newCb = jest.fn((args) => Promise.resolve('wrong'));
      cache.access(
        'foo',
        { bar: 'baz' },
        newCb
      ).then(result => {
        expect(newCb).not.toHaveBeenCalled();
        expect(result).toBe(args.toString());
      });
    });
  });
});

describe('.accessJson(msgId, args, getResult)', () => {
  it(`Stores stringified JSON and returns it parsed.`, () => {
    const cb = jest.fn((args) => args);
    return cache.accessJson(
      '456',
      { foo: 'bar' },
      cb
    ).then(result => {
      expect(cb).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ foo: 'bar' });
    }).then(() => {
      const newCb = jest.fn((args) => 'wrong');
      cache.accessJson(
        '456',
        { foo: 'bar' },
        newCb
      ).then(result => {
        expect(newCb).not.toHaveBeenCalled();
        expect(result).toEqual({ foo: 'bar' });
      });
    });
  });

});

describe('.clear(msgId)', () => {
  it(`Removes all cache entries related to given 'msgId'`, () => {
    return cache.access('baz', { foo: 'bar' }, (o) => o)
      .then();
  });
});
