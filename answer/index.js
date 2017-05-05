const path = require("path");
const express = require("express");
const app = express();
const sendToStorage = require('./send-to-storage');
const bodyParser = require('body-parser')
const watson = require('../watson-services');
const isAuthenticated = (req) => true; //req.body.password === 'pass';
const uuid = require('uuid/v4');
const log = require('../utils/log');
const omit = require('lodash/omit');

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
      const message = {
        ...omit(req.body, 'context'),
        message_id: messageId,
      };
      console.log("--------- message right befre sentostorage----------");
      console.log(message);
      return sendToStorage({ message, response });
    });
});

app.use(express.static(path.resolve(__dirname, '../views')));


const port = process.env.PORT || 3000
app.listen(port, function() {
  console.log(`[answer] Server started at http://localhost:${port}`);
});
