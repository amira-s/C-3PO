const promisify = require('es6-promisify');
const cacheFactory = require('./cache');

let cache = null;
cacheFactory({ verbose: !!process.env.DEBUG }).then((c) => { cache = c; });

function memoize(remoteApi) {
  return function memoized(msgId, ...args) {
    const apply = (args) => remoteApi(...args);
    if (!cache) {
      console.error('[memoize] Cache not initialized (yet), bypassing...');
      return apply(args);
    }
    return cache.accessJson(
      msgId,
      args,
      apply,
    );
  };
};

const memoizeCallbackStyle = (service) => memoize(promisify(service));

module.exports = {
  memoize,
  memoizeCallbackStyle,
};
