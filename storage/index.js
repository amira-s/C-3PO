const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const uuid = require('uuid/v4');
const log = require('../utils/log');

const addMessageListener = require('./add-message')();

var isAuthenticated = (req, callback) => {
  var token = req.get("Authorization");
  new Storage("cloudantNoSQLDB", "token", (db) => {
    db.find({selector:{token}}, (er, result) => {
      if (result.docs.length <= 0) {
        callback(false);
        return;
      }
      callback(true);
    });
  });
};

var getUserId = (req, callback) => {
  var token = req.get("Authorization");
  new Storage("cloudantNoSQLDB", "token", (db) => {
    db.find({selector:{token}}, (er, result) => {
      if (result.docs.length <= 0) {
        callback("");
        return;
      }
      callback(result.docs[0]._id);
    });
  });
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

var tokenRequired = (req, res, next) => {
  isAuthenticated(req, (bool) => {
    if (!bool) {
      res.json({"error": "Not authenticated"});
      return;
    }
    next();
  });
};

/* ************* COMMON DB ******************
*
*
*    req.body {
*        id_session : (string),
*        time : (timeStamp),
*        group: (string),
*        input: { 
*            type : "text",
*            text : (string)  },
*        output: {
*             type: "text"
*            text : (string)  },
*         watson: [{conversation}, ]
*    }
*
*    @content {
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

/************ BACKOFFICE DB **********************/
app.post("/api/v1/register", (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let email = req.body.email
  new Storage("cloudantNoSQLDB", "user", (db) => {
    db.find({selector:{username}}, (er, result) => {
      if (result.docs.length > 0)
        res.json({"error": "User already exist"});
      else 
        db.insert({username, password, email}, (err, data) => {res.json({"res": "Ok"});});
    });
  });
});

app.post("/api/v1/token", (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  new Storage("cloudantNoSQLDB", "user", (db) => {
    db.find({selector:{username, password}}, (er, result) => {
      if (result.docs.length <= 0)
        res.json({"error": "User unknown"});
      else {
        new Storage("cloudantNoSQLDB", "token", (db) => {
          var id = result.docs[0]._id;
          db.find({selector:{_id: id}}, (er, result) => {
            if (result.docs.length <= 0) {
              var token = uuid();
              db.insert({_id: id, token}, (err, data) => {
                res.json({token});
              });
            }
            else
             res.json({"token": result.docs[0].token}); 
         });
        });
      }
    });
  });
});

app.use("/api/v1/org*", tokenRequired);
app.use("/api/v1/usr*", tokenRequired);

app.get("/api/v1/usr", (req, res) => {
  new Storage("cloudantNoSQLDB", "user", (db) => {
    getUserId(req, (str) => {
      db.find({selector:{_id: str}}, (er, result) => {
        res.json(result);
      });
    });
  });
});

app.get("/api/v1/org", (req, res) => {
  new Storage("cloudantNoSQLDB", "org", (db) => {
    getUserId(req, (str) => {
      db.find({selector:{owner: str}}, (er, result) => {
        res.json(result);
      });
    });
  });
});

app.post("/api/v1/org", (req, res) => {
  let name = req.body.name;
  let img = req.body.img
  let adminToken = uuid();
  let clientToken = uuid();
  new Storage("cloudantNoSQLDB", "org", (db) => {
    getUserId(req, (str) => {
      db.insert({clientToken, adminToken, name, img, owner: str}, (err, data) => {
        res.json({"res": "Ok"});
      });
    });
  });
});

app.get("/api/v1/org/:id", (req, res) => {
  new Storage("cloudantNoSQLDB", "org", (db) => {
    getUserId(req, (str) => {
      db.find({selector:{_id: req.params.id, owner: str}}, (er, result) => {
        res.json(result);
      });
    });
  });
});

app.post("/api/v1/conv", (req, res) => {
  //Unsafe AF
  let clientToken = req.body.clientToken;
  let convId = req.body.convId;
  new Storage("cloudantNoSQLDB", "conv", (db) => {
    db.insert({clientToken, convId}, (err, data) => {
      res.json({"res": "Ok"});
    });
  });
});

app.get("/api/v1/token/:org", (req, res) => {
  let orgName = req.params.org;
  new Storage("cloudantNoSQLDB", "org", (db) => {
    db.find({selector:{name: orgName}}, (er, result) => {
      if (result.docs.length <= 0)
        res.json({"error": "Org unknown"});
      else {
        new Storage("cloudantNoSQLDB", "client", (db) => {
          let token = uuidV4();
          db.insert({orgName: result.docs[0].name, clientToken: token}, (err, data) => {
            res.json({token});
          });
        });
      }
    });
  });
});

var port = process.env.PORT || 3001
app.listen(port, function() {
  console.log(`[storage] Server listening at http://localhost:${port}`);
});
