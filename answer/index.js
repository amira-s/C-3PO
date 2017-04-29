const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require('body-parser')
// var storage = require('./storage');
const watson = require('../watson-services');
const isAuthenticated = (req) => true; //req.body.password === 'pass';

// var store = new Storage("cloudantNoSQLDB", "mydb");


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
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
*    "conversation_id" : "",
*    "time" : timestamp,
*    "input" : {
*      "type" : "text",
*      "content" : "Hi !"
*    },
*    "context": object
*  }
*/

app.post("/api/v1/message", (req, res) => {
  console.log('----------------------------------------', new Date());
  console.log("text :", req.body.input.text);
  watson.conversation({input: {text: req.body.input.text}, context: req.body.context})
    .then((response) => {
      console.log("watson : ", response.output.text);
      res.send(JSON.stringify(response));
    })
    .catch((err) => {
      console.log(err);
      res.send("Watson isn't responding.");
    })
    .then(() => {
      watson.nlu(req.body.input.text);
      watson.tone_analyzer(req.body.input.text);
    });
});

app.use(express.static(path.resolve(__dirname, '../views')));


var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});
