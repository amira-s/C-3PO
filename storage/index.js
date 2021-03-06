const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const uuid = require('uuid/v4');
const log = require('../utils/log');
const Storage = require('./Storage');

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

app.post('/api/v1/add-message', require('./add-message'));


app.use(function(req, res, next) {
  console.log("----------------------REQ---");
  console.log(req.body);
  console.log("--------------------------");
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
          console.log("--------INSERT ADD-MESSAGE---------");
          console.log(content.stringify());
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
  let clientToken = req.body.clientToken;
  let convId = req.body.convId;
  let date = req.body.date;
  new Storage("cloudantNoSQLDB", "conv", (db) => {
    db.insert({clientToken, convId, Date}, (err, data) => {
      res.json({"res": "Ok"});
      console.log("REGISTERING CONV ID");
      console.log("ERR ENCOUTERED ", err);
    });
  });
});

app.get("/api/v1/conv/:token", (req, res) => {
  let clientToken = req.params.token;
  new Storage("cloudantNoSQLDB", "conv", (db) => {
    db.find({selector:{clientToken}}, (er, result) => {
      res.json(result);
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
          let token = uuid();
          db.insert({orgName: result.docs[0].name, clientToken: token}, (err, data) => {
            res.json({token: token});
          });
        });
      }
    });
  });
});

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

// TODO get nombre total de conversation
// TODO get nombre total d'utilisateur
// TODO get percentage of bad events, good events, average events
// TODO ...

//ONMOBILE need partie prenante + risque + impact per conv

var getData = (result) => {
  var words = {};
  var mood = 0;
  var category = {};
  var messages = result.docs.length;

  for (var i = result.docs.length - 1; i >= 0; i--) {
    if (result.docs[i].watson[2] != undefined) {
      for (var y = result.docs[i].watson[2].keywords.length - 1; y >= 0; y--) {
        let wrd = capitalizeFirstLetter(String(result.docs[i].watson[2].keywords[y].text));
        if (words[wrd] == undefined)
          words[wrd] = 1;
        else
          words[wrd] += 1;
      }
    }
    if (result.docs[i].watson[0].intents.length > 0) {
      if (result.docs[i].watson[0].intents[0].intent == "good_mood")
        mood = 1;
      else if (result.docs[i].watson[0].intents[0].intent == "bad_mood")
        mood = -1;
    }
    if (i === 3)
    {
      if (category[result.docs[i].input.text] === undefined)
        category[result.docs[i].input.text] = 1;
      else
        category[result.docs[i].input.text] += 1;
    }
  }
  return {mood, words, category, messages};
}


app.get("/api/v1/stats/user/:session", (req, res) => {
  let id_session = req.params.session;
  new Storage("cloudantNoSQLDB", "codecamp", (db) => {
    db.find({selector:{id_session}}, (er, result) => {
      res.json(getData(result));
    });
  });
});

app.get("/api/v1/stats/:orgName", (req, res) => {
  let group = req.params.orgName;
  new Storage("cloudantNoSQLDB", "codecamp", (db) => {
    db.find({selector:{group}}, (er, result) => {
      res.json(getData(result));
    });
  });
});

app.get("/api/v1/stats", (req, res) => {
  new Storage("cloudantNoSQLDB", "codecamp", (db) => {
    db.find({selector:{}}, (er, result) => {
      res.json(getData(result));
    });
  });
});

var port = process.env.PORT || 3001
app.listen(port, function() {
  console.log(`[storage] Server listening at http://localhost:${port}`);
});
