const throttle = require('lodash/throttle');
const Redis = require('ioredis');
const md5 = require('md5');
const jsonStringify = require('json-stringify-deterministic');

function hash(obj) {
  return md5(jsonStringify(obj));
}

function stringify(o) {
  return typeof o === 'string' ? o : JSON.stringify(o);
}

class Cache {
  constructor() {
    this.access = this.access.bind(this);
    this.accessJson = this.accessJson.bind(this);
    this.clear = this.clear.bind(this);
    this.clearAll = this.clearAll.bind(this);
  }
  init() {
    return new Promise((resolve, reject) => {
      const redis = new Redis({
        enableReadyCheck: true,
        showFriendlyErrorStack: (process.env.NODE_ENV !== 'production' ? true : false),
      });
      this.redis = redis;

      // Handle Redis connection error
      let connectionTries = 20;
      const connectionTryInterval = 2e3;

      const logRedisConnectionError = throttle((e) => {
        if (connectionTries < 0) {
          reject(e);
        } else {
          console.error(`[cache] Can't connect to Redis server on default port 6379.` +
            ` (${connectionTries})`);
          connectionTries -= 1
        }
      }, connectionTryInterval);

      redis.on('error', (e) => {
        if (e.errno === 'ECONNREFUSED') {
          logRedisConnectionError(e);
        }
      });
      redis.on('ready', () => {
        resolve(this);
      });
    });
  }
  /**
   * Try to access cached value with arguments `args` in namespace `msgId`. If
   * none exists, call `getResult` with `args`, cache the result in Redis
   * database, and return the result.
   * @param {string} msgId
   * @param {T} args
   * @param {(T) => string|Promise<string>} getResult
   */
  access(msgId, args, getResult) {
    const key = hash(args);

    const setAndResolveResult = (result) => {
      return this.redis.hset(msgId, key, result)
        .then(() => Promise.resolve(result.toString()));
    }

    return this.redis.hget(msgId, key)
      .then((cached) => {
        if (cached !== null) {
          return Promise.resolve(cached);
        }
        const result = getResult(args);
        return (result instanceof Promise) ?
          result.then(setAndResolveResult) :
          setAndResolveResult(result);
      });
  }
  /**
   * Like .access, but serialise JSON before storing it, and parse it before
   * returning it.
   * @param {string} msgId
   * @param {*} args
   * @param {(*) => object|Promise<object>} getResult
   */
  accessJson(msgId, args, getResult) {
    const getResultStr = (...args) => {
      const result = getResult(...args);
      return result instanceof Promise ?
        result.then(stringify) :
        stringify(result);
    }
    return this.access(msgId, args, getResultStr)
      .then(res => Promise.resolve(JSON.parse(res)));
  }
  /**
   * Remove all Redis entries associated with namespace `msgId`.
   */
  clear(msgId) {
    return this.redis.del(msgId);
  }
  /**
   * Wipe all entries in Redis database.
   */
  clearAll() {
    console.log('[cache] Flushing Redis cache...');
    return this.redis.flushall();
  }
}

module.exports = (...args) => {
  const cache = new Cache();
  return cache.init(...args);
};
