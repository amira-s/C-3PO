const watson = require('watson-developer-cloud');
const cfenv = require("cfenv");
const promisify = require('es6-promisify');
const cacheFactory = require('./cache');
const log = require('../utils/log');

let cache = null;
cacheFactory({ verbose: !!process.env.DEBUG }).then((c) => { cache = c; });

function memoize(remoteApi) {
  return function memoized(msgId, ...args) {
    const apply = (args) => remoteApi(...args);
    if (!cache) {
      console.error('[watson-servies] Cache not initialized (yet), bypassing...');
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

// load local VCAP configuration  and service credentials
let vcapLocal;
try {
  vcapLocal = require('../vcap-local.json');
  log("watson-services: Loaded local VCAP", vcapLocal);
} catch (e) { }

let appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
let appEnv = cfenv.getAppEnv(appEnvOpts);

const conversation_message = memoizeCallbackStyle((() => {
  const {username, password} = appEnv.services.conversation[0].credentials;
  const conversation = watson.conversation({
    username,
    password,
    version: 'v1',
    version_date: '2017-04-21'
  });
  return (...args) => conversation.message(...args);
})());

const tone_analyzer_tone = memoizeCallbackStyle((() => {
  const {username, password} = appEnv.services["tone_analyzer"][0].credentials;
  const tone_analyzer = watson.tone_analyzer({
    username,
    password,
    version: 'v3',
    version_date: '2016-05-19'
  });
  return (...args) => tone_analyzer.tone(...args);
})());

const natural_language_understanding_analyze = memoizeCallbackStyle((() => {
  const {username, password} = appEnv.services["natural-language-understanding"][0].credentials;
  const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
  const natural_language_understanding = new NaturalLanguageUnderstandingV1({
    username,
    password,
    'version_date': '2017-02-27'
  });
  return (...args) => natural_language_understanding.analyze(...args);
})());


module.exports = {
  //msg => string representing user's message
  conversation : function conversation(msg) {
    const parameters = {
      workspace_id: '31790861-0e9b-4203-a717-40377000742e',
      context: msg.context || {},
      input: msg.input || {}
    };
    return conversation_message('DUMMY_MSG_ID', parameters)
      .then(res => {
          log('[conversation]: ', JSON.stringify(res, null, 2));
          return Promise.resolve(res);
        });
  },

  //msg => string representing user's message
  tone_analyzer : function tone_analyzer(msg) {
    const parameters = {
      text: msg,
      tones: "emotion",
    };
    return tone_analyzer_tone('DUMMY_MSG_ID', parameters)
      .then(res => {
        log('[tone_analyzer]: ', JSON.stringify(res, null, 2));
        return Promise.resolve(res);
      });
  },

  //data is a string of text to analyze = user's input.
  //maybe accept parameters as a function parameter later
  //or just the limits number
  nlu : function nlu(data) {
    const parameters = {
      'text': data,
      'features': {
        'entities': {
          'emotion': true,
          'sentiment': true,
          'limit': 3
        },
        'keywords': {
          'emotion': true,
          'sentiment': true,
          'limit': 3
        }
      }
    }
    return natural_language_understanding_analyze('DUMMY_MSG_ID', parameters)
      .then(res => {
        log('[natural_language_understanding]: ', JSON.stringify(res, null, 2));
        return Promise.resolve(res);
      });
  }
}
