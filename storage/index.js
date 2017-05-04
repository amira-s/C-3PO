const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const watson = require('../watson-services');
const Storage = require('./Storage.js');
const uuidV4 = require('uuid/v4');

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
app.post("/api/v1/add-message", (req, res) => {
  console.log('----------------------------------------', new Date());
  console.log(req.body);
  let content = {
    ...req.body,
    id_session: "amira_s" + req.body.id_session,
  }

  watson.tone_analyzer(content.input.text)
    .then((response) => {
      console.log("tone_analyzer added");
      console.log(JSON.stringify(response, null, 2));
      content.watson.push(response);
    })
    .catch((err) => {
      console.log("Tone analyzer ====== ", err);
    })
    .then(() => {
      return watson.nlu(content.input.text)
        .then((response) => {
          console.log("natural language understanding added");
          console.log(JSON.stringify(response, null, 2));
          content.watson.push(response);
        })
        .catch((err) => {
          console.log("NLU ====== ", err);
        });
    })
    .then(() => {
      new Storage("cloudantNoSQLDB", "codecamp", (db) => {
        db.insert(content, (err, data) => {
          if (err)
            console.log("ERRR", err);
          if (data)
            console.log("DATA", data);
          res.json({"res": "Ok"});});
      });      
    });
});

/************ BACKOFFICE DB **********************/
app.post("/api/v1/register", (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  new Storage("cloudantNoSQLDB", "user", (db) => {
    db.find({selector:{username}}, (er, result) => {
      if (result.docs.length > 0)
        res.json({"error": "User already exist"});
      else 
        db.insert({username, password}, (err, data) => {res.json({"res": "Ok"});});
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
              var token = uuidV4();
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
  new Storage("cloudantNoSQLDB", "org", (db) => {
    getUserId(req, (str) => {
      db.insert({name, owner: str}, (err, data) => {
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

app.put("/api/v1/org/:id", (req, res) => {

});

app.delete("/api/v1/org/:id", (req, res) => {

});

var port = process.env.PORT || 3001
app.listen(port, function() {
    console.log("Listening on:  http://localhost:" + port);
});
