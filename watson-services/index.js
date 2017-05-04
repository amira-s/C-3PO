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
		return new Promise((success, reject) => {
			tone.tone({text: msg, tones: "emotion"}, function(err, tone) {	
			    if (err)
			      reject(err);
			    else {
			      success(tone);
				}
			});
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
		  	'categories': {},
		  	'concepts': {limit: 3},
		  	'categories': {},		  	
		    'entities': {
		      'emotion': true,
		      'sentiment': true,
		      'limit': 20
		    },
		    'keywords': {
		      'emotion': true,
		      'sentiment': true,
		      'limit': 20
		    }
		  }
		}

		return new Promise((resolve, reject) => {
			natural_language_understanding.analyze(parameters, function(err, response) {
			  if (err)
				reject(err);			  
			  else
			  {
			    resolve(response);
			  }
			});
		});
	}
}