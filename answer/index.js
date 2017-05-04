const path = require("path");
const express = require("express");
const fetch = require("node-fetch"); 
const app = express();
const bodyParser = require('body-parser')
const watson = require('../watson-services');
const isAuthenticated = (req) => true; //req.body.password === 'pass';
const uuid = require('uuid/v4');
const log = require('../utils/log');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use("/api", (req, res, next) => {
  if (!isAuthenticated(req)) {
    res.code(503);
    res.send("Not authenticated");
    return;
  }
  next();
});

/*
*  Endpoint to send user input and get the bots response
*  User input in then treated and added to the db
*  Send POST request to /api/v1/message with body 
*  {
*    "id_session" : "",
     "group" : "ETNA",
*    "time" : timestamp,
*    "input" : {
*      "type" : "text",
*      "text" : "Hi !"
*    },
*    "context": object
*  }
*/

app.post("/api/v1/message", (req, res) => {
  const messageId = uuid();
  console.log(
    '------------',
    `message ID: [${messageId}]`,
    'time: [', new Date(), ']');
  log("text :", req.body.input.text);
  watson.conversation({input: {text: req.body.input.text}, context: req.body.context}, messageId)
    .then((response) => {
      log("watson : ", response.output.text);
      res.send(JSON.stringify(response));
      return Promise.resolve(response);
    })
    .catch((err) => {
      console.log(err);
      res.send("Watson isn't responding.");
    })
    .then((response) => {
      delete req.body.context;
      let data = {
        ...req.body,
        output: {type: "text", text: response.output.text},
        watson: []
      };
      data.watson.push(response);

      log("DATA FOR POST REQUEST TO STORAGE", data);

      fetch('http://localhost:3001/api/v1/add-message', { 
          method: 'POST',
          headers: {'Content-Type': "application/json"},
        body: JSON.stringify({
          ...data,
          message_id: messageId,
        }),
        })
        .then(function(res) {
            return res.json();
        }).then(function(json) {
          log('[/api/v1/message] /api/v1/add-message return:', json);
        });
    });
});

app.use(express.static(path.resolve(__dirname, '../views')));


const port = process.env.PORT || 3000
app.listen(port, function() {
    console.log(`[answer] Server started at http://localhost:${port}`);
});
