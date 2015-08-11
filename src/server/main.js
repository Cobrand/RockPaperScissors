"use strict";
var express = require('express');
var colors = require('colors');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.argv.slice(2).length > 0 ? process.argv.slice(2)[0] : 61123 ;

app.use('/',express.static(__dirname + '/public/'));
app.get('/', function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});

app.get('/room/:roomid', function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});

http.listen( port, function(){
	console.log("listening on :"+port);
});

io.on('connection', function(socket){

	console.log('a new user connected : '+(""+socket.id).red);

	socket.on('disconnect',function(){
		console.log('user disconnected : '+(""+socket.id).red);
	}); 
	
});