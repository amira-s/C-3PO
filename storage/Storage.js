var cfenv = require("cfenv");
var vcapLocal;
try {
  vcapLocal = require('../vcap-local.json');
  console.log("storage : Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts);

module.exports = class Storage {

  constructor(service, dbName, callback) {
   if (appEnv.services[service]) {
        // Load the Cloudant library.
        var Cloudant = require('cloudant');
        // Initialize database with credentials
        var cloudant = Cloudant(appEnv.services[service][0].credentials);
        // Create a new "mydb" database.
        cloudant.db.create(dbName, function(err, data) {
          callback(cloudant.db.use(dbName));
          if(!err) //err if database doesn't already exists
            console.log("Created database: " + dbName);
        });
        // Specify the database we are going to use (mydb)...
        this.mydb = cloudant.db.use(dbName);
      }
    }

  /* @content {
  *      "id_session": (string "chef_token"),
  *      "date": (timestamp),
  *      "group": (string),
  *      "input": {
  *          "type": (string 'text', 'img', ...),
  *          "data": (string)
  *          },
  *      "output": {
  *          "type": (string 'text', 'img', ...),
  *          "data": (string)
  *          },
  *      "watson": [{}, {}]
  *  }
  */
  insert(content) {
    this.mydb.insert({ crazy: true }, 'rabbit', function(err, body, header) {
      if (err) {
        return console.log('[mydb.insert] ', err.message);
      }
      response.send(data + "added to the database.");
    });
  }
}