var log = require('winston');

var express = require('express');

var app = express();

app.use('/webtrek',express.static(__dirname+'/public/webtrek'));
app.use('/synterest',express.static(__dirname+'/public/synterest'));

app.listen(8080);

console.log("Listening...");
