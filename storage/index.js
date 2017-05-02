var express = require("express");
var app = express();
var bodyParser = require('body-parser')
var Storage = require('./Storage.js');
var isAuthenticated = (req) => true; //req.body.password === 'pass';

var store = new Storage("cloudantNoSQLDB", "mydb");

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

app.post("/api/v1/add-message", (req, res) => {
  console.log('----------------------------------------', new Date());
  console.log("text :", req.body.input.text);
  //todo send data to module and display response
  res.send("data saved");
});

var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});
