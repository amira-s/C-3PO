const watson = require('watson-developer-cloud');
const cfenv = require("cfenv");
const log = require('../utils/log');
const {
  memoizeCallbackStyle: memoize,
  clear
} = require('../utils/memoize');

// load local VCAP configuration  and service credentials
let vcapLocal;
try {
  vcapLocal = require('../vcap-local.json');
  log("watson-services: Loaded local VCAP", vcapLocal);
} catch (e) { }

let appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
let appEnv = cfenv.getAppEnv(appEnvOpts);

const conversation_message = memoize((() => {
  const {username, password} = appEnv.services.conversation[0].credentials;
  const conversation = watson.conversation({
    username,
    password,
    version: 'v1',
    version_date: '2017-04-21'
  });
  return (...args) => conversation.message(...args);
})());

const tone_analyzer_tone = memoize((() => {
  const {username, password} = appEnv.services["tone_analyzer"][0].credentials;
  const tone_analyzer = watson.tone_analyzer({
    username,
    password,
    version: 'v3',
    version_date: '2016-05-19'
  });
  return (...args) => tone_analyzer.tone(...args);
})());

const natural_language_understanding_analyze = memoize((() => {
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
  conversation : function conversation(msg, msgId) {
    const parameters = {
      workspace_id: '31790861-0e9b-4203-a717-40377000742e',
      context: msg.context || {},
      input: msg.input || {}
    };
    return conversation_message(msgId, parameters)
      .then(res => {
          log('[conversation]: ', JSON.stringify(res));
          return Promise.resolve(res);
        });
  },

  //msg => string representing user's message
  tone_analyzer : function tone_analyzer(msg, msgId) {
    const parameters = {
      text: msg,
      tones: "emotion",
    };
    return tone_analyzer_tone(msgId, parameters)
      .then(res => {
        log('[tone_analyzer]: ', JSON.stringify(res));
        return Promise.resolve(res);
      });
  },

  //data is a string of text to analyze = user's input.
  //maybe accept parameters as a function parameter later
  //or just the limits number
  nlu : function nlu(data, msgId) {
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
    return natural_language_understanding_analyze(msgId, parameters)
      .then(res => {
        log('[natural_language_understanding]: ', JSON.stringify(res));
        return Promise.resolve(res);
      });
  },
  lastCall: function lastCall(msgId) {
    return clear(msgId);
  }
}
