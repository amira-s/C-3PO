var cfenv = require("cfenv");

// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('../../vcap-local.json');
  console.log("storage : Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts);

module.exports = class Storage {

  constructor(service, dbName) {
    if (appEnv.services[service]) { 
        // Load the Cloudant library.
        var Cloudant = require('cloudant');

        // Initialize database with credentials
        var cloudant = Cloudant(appEnv.services[service][0].credentials);


        // Create a new "mydb" database.
        cloudant.db.create(dbName, function(err, data) {
          if(!err) //err if database doesn't already exists
            console.log("Created database: " + dbName);
        });

        // Specify the database we are going to use (mydb)...
        this.mydb = cloudant.db.use(dbName);
    }
  }

  // content { "name" : userName }
  insert(content) {
    this.mydb.insert(content, function(err, body, header) {
      if (err) {
        return console.log('[mydb.insert] ', err.message);
      }
      response.send("Hello " + userName + "! I added you to the database.");
    });
  }
}