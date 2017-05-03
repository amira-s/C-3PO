const promisify = require('es6-promisify');
const cacheFactory = require('./cache');

let cache = null;
cacheFactory({ verbose: !!process.env.DEBUG }).then((c) => { cache = c; });

function memoize(remoteApi) {
  return function memoized(namespace, ...args) {
    const apply = (args) => remoteApi(...args);
    if (!cache) {
      console.error('[memoize] Cache not initialized (yet), bypassing...');
      return apply(args);
    }
    return cache.accessJson(
      namespace,
      args,
      apply,
    );
  };
};

const memoizeCallbackStyle = (service) => memoize(promisify(service));

function clear(namespace) {
  return cache.clear(namespace);
}

module.exports = {
  memoize,
  memoizeCallbackStyle,
  clear,
};
