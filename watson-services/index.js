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

module.exports = {
	//msg => string representing user's message
	conversation : function(msg) {
		const {username, password} = appEnv.services.conversation[0].credentials;
		let conv = watson.conversation({
		  username,
		  password,
		  version: 'v1',
		  version_date: '2017-04-21'
		});

		return new Promise((success, reject) => {
			conv.message({
				workspace_id: '31790861-0e9b-4203-a717-40377000742e',
				context: msg.context || {},
				input: msg.input || {}
			}, function(err, response) {
				if (err) {
					reject(err);
				} else {
					console.log(JSON.stringify(response, null, 2));
					success(response);
				}
			});
		});

	},
	//msg => string representing user's message
	tone_analyzer : function(msg) {
		const {username, password} = appEnv.services["tone_analyzer"][0].credentials;

		var tone = watson.tone_analyzer({
			username,
			password,
			version: 'v3',
			version_date: '2016-05-19'
		});
		
		tone.tone({text: msg}, function(err, tone) {	
		    if (err)
		      console.log(err);
		    else
		      console.log(JSON.stringify(tone, null, 2));
		});
	},
	//data is a string of text to analyze = user's input.
	//maybe accept paramters as a function parameter later
	//or just the limits number
	nlu : function(data) {
		const {username, password} = appEnv.services["natural-language-understanding"][0].credentials;
		var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
		var natural_language_understanding = new NaturalLanguageUnderstandingV1({
		  username,
		  password,
		  'version_date': '2017-02-27'
		});
	
		var parameters = {
		  'text': data,
		  'features': {
		    'entities': {
		      'emotion': true,
		      'sentiment': true,
		      'limit': 2
		    },
		    'keywords': {
		      'emotion': true,
		      'sentiment': true,
		      'limit': 2
		    }
		  }
		}

		natural_language_understanding.analyze(parameters, function(err, response) {
		  if (err)
		    console.log('error:', err);
		  
		  else
		    console.log(JSON.stringify(response, null, 2));
		});
	}
}