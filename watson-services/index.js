const watson = require('watson-developer-cloud');
const cfenv = require("cfenv");

// load local VCAP configuration  and service credentials
let vcapLocal;
try {
  vcapLocal = require('../vcap-local.json');
  console.log("watson-services: Loaded local VCAP", vcapLocal);
} catch (e) { }

let appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
let appEnv = cfenv.getAppEnv(appEnvOpts);

const conversation_service = (() => {
  const {username, password} = appEnv.services.conversation[0].credentials;
  return watson.conversation({
    username,
    password,
    version: 'v1',
    version_date: '2017-04-21'
  });
})();

const natural_language_understanding = (() => {
  const {username, password} = appEnv.services["natural-language-understanding"][0].credentials;
  const NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
  return new NaturalLanguageUnderstandingV1({
    username,
    password,
    'version_date': '2017-02-27'
  });
})();

const tone_service = (() => {
  const {username, password} = appEnv.services["tone_analyzer"][0].credentials;
  return watson.tone_analyzer({
    username,
    password,
    version: 'v3',
    version_date: '2016-05-19'
  });
});

module.exports = {
  //msg => string representing user's message
  conversation : function conversation(msg) {
    return new Promise((resolve, reject) => {
      conversation_service.message(
        {
          workspace_id: '31790861-0e9b-4203-a717-40377000742e',
          context: msg.context || {},
          input: msg.input || {}
        },
        (err, response) => {
          if (err) {
            reject(err);
          } else {
            console.log('[conversation]: ', JSON.stringify(response, null, 2));
            resolve(response);
          }
        });
    });

  },
  //msg => string representing user's message
  tone_analyzer : function tone_analyzer(msg) {
    return new Promise((resolve, reject) => {
      tone_service.tone({text: msg, tones: "emotion"}, (err, tone) => {
        if (err)
          reject(err);
        else {
          resolve(tone);
        }
      });
    });
  },
  //data is a string of text to analyze = user's input.
  //maybe accept paramters as a function parameter later
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

    return new Promise((resolve, reject) => {
      natural_language_understanding_service.analyze(parameters, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  }
}
