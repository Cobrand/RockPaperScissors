"use strict";
var express = require('express');
var moment = require('moment');
var colors = require('colors');
var xmlentities = new (require('html-entities').XmlEntities)() ;
var inspect = require('util').inspect ;
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.argv.slice(2).length > 0 ? process.argv.slice(2)[0] : 61123 ;
var rooms = {} ;

function joinRoom(socket,roomid,name){
	socket.roomid = roomid ;
	socket.join(roomid);
	rooms[roomid] = rooms[roomid] || {nbPlayers : 0,
									  nbSpectators : 0 ,
									  history : [],
									  players: {} } ;
	rooms[roomid].nbPlayers += 1 ;
	rooms[roomid].players[socket.id] = {score:0,name:name,selected:"none"};
}

function deepCopy(o){
	return JSON.parse(JSON.stringify(o)); // dirty
}

function playTurn(roomid){
	var room = rooms[roomid];
	var players = {} ;
	var entries = {scissors:[],paper:[],rock:[]} ;
	var winner = null ;
	var loser = null ;
	for (var pid in room.players){
		players[pid] = {name:room.players[pid].name}
		var selected = room.players[pid].selected ;
		if (selected === "paper" || selected === "rock" || selected === "scissors"){
			entries[selected].push(room.players[pid].name);
		}
	}
	if (entries.paper.length > 0 && entries.scissors.length > 0 && entries.rock.length === 0){
		winner = "scissors";
		loser = "paper";
	}else if (entries.rock.length > 0 && entries.scissors.length > 0 && entries.paper.length === 0){
		winner = "rock";
		loser = "scissors";
	}else if (entries.paper.length > 0 && entries.rock.length > 0 && entries.scissors.length === 0){
		winner = "paper";
		loser = "rock";
	}else{
		winner = "tie" ;
		loser = "tie";
	}
	if (winner !== "tie"){
		entries[winner]
		
	}
	for (var pid in room.players){
		players[pid].selected = room.players[pid].selected ;
		if (players[pid].selected === winner){
			players[pid].win = 1 ;
			room.players[pid].score += 1 ;
		}else if (players[pid].selected === loser){
			players[pid].win = -1 ;
		}else{
			players[pid].win = 0 ;
		}
		players[pid].score = room.players[pid].score
	}
	if (winner === "tie" && loser === "tie"){
		if (entries.paper.length > 0 && entries.scissors.length > 0 && entries.rock.length >0){
			room.history.push({timestamp:Date.now(),
							   msg:"TIE ! "+(entries.scissors.join(", ")+" played paper, ")
									+(entries.scissors.join(", ")+" played scissors and ")
									+(entries.rock.join(", ")+" played rock")
							  });
		}else{
			room.history.push({timestamp:Date.now(),
							   msg:"TIE ! Everyone played "+(entries.scissors.length > 0 ? "scissors" : (entries.rock.length > 0 ? "rock" : "paper")) + "!" 
							  });
		}
	}else{
		room.history.push({timestamp:Date.now(),msg:""+entries[winner].join(", ")+" played "+winner+" and won this round."});
	}
	
	io.to(roomid).emit("result",{
		players:players,
		history:room.history
	});
	for (var pid in room.players){
		room.players[pid].selected = "none" ;
	}
}

function updateRoom(socket,changes){
	changes = changes || {} ;
	
	if (changes.logmessage){
		rooms[socket.roomid].history.push({timestamp:Date.now(),msg:changes.logmessage});
	}
	if (changes.selected){
		rooms[socket.roomid].players[socket.id].selected = changes.selected ;
		var everyone_checked = true ;;
		for (var pid in rooms[socket.roomid].players){
			var which_selected = rooms[socket.roomid].players[pid].selected
			if (which_selected == "none" || which_selected === false ){
				everyone_checked = false ;	
			}
		}
		if (everyone_checked && rooms[socket.roomid].nbPlayers > 1 ){
			playTurn(socket.roomid);
			return ;
		}
	}
	
	if (rooms[socket.roomid] == null){return;}
	io.to(socket.roomid).emit("update",{
		players:filterPlayersObject( deepCopy(rooms[socket.roomid].players)),
		history:rooms[socket.roomid].history
	});
}

function leaveRoom(socket,roomid){
	socket.leave(roomid);
	if (rooms[roomid] && rooms[roomid].players[socket.id]){
		var username = rooms[socket.roomid].players[socket.id].name ;
		rooms[roomid].nbPlayers -= 1 ;
		delete rooms[roomid].players[socket.id] ;
		updateRoom(socket,{logmessage:"<b>"+xmlentities.encode(username)+"</b> left the room."});		
		return true ;
	}
	else{// player didnt exist
		return false ;	
	}
}

function filterPlayersObject(players){
	for (var pid in players){
		if (players[pid].selected === "rock" || players[pid].selected === "paper" || players[pid].selected === "scissors"){
			players[pid].selected = true ;
		}
		else{
			players[pid].selected = false ;
		}
	}
	return players ;
}


app.use('/',express.static(__dirname + '/public/'));
app.get('/', function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});

app.get('/room/:roomid', function(req, res){
	res.sendFile(__dirname + '/public/index.html');
});

app.get('/room/', function(req, res){
	res.redirect('/');
});

app.get('/status', function(req, res){
	var public_rooms = {} ;
	for (var roomid in rooms){
		if (rooms[roomid].private){
			
		}else{
			public_rooms[roomid] = deepCopy(rooms[roomid]);
			public_rooms[roomid].players = filterPlayersObject(public_rooms[roomid].players);
			//console.log(inspect(rooms,{depth:5,colors:true}));
		}
	}
	res.json(public_rooms);
});

http.listen( port, function(){
	console.log("listening on :"+port);
});

io.on('connection', function(socket){

	console.log('a new user connected : '+(""+socket.id).red);

	socket.on('login',function(msg){
		if (rooms[msg.room] == null || rooms[msg.room].nbPlayers < 5){
			joinRoom(socket,msg.room,msg.username);
			socket.emit("loginanswer",
						{
							status:"OK",
					   		players:filterPlayersObject( deepCopy(rooms[socket.roomid].players))
					  	});
			updateRoom(socket,{logmessage:"<b>"+xmlentities.encode(msg.username)+"</b> joined the room."});
		}else{
			socket.emit("loginanswer",{status:"ROOMFULL"});
		}
	});
	
	socket.on("select",function(msg){
		if (msg !== "non" && msg !== "paper" && msg !== "scissors" && msg !== "rock"){
			return ;
		}
		updateRoom(socket,{selected:msg});
	});
	
	socket.on('disconnect',function(){
		leaveRoom(socket,socket.roomid);
		console.log('user disconnected : '+(""+socket.id).red);
	}); 
	
	socket.on('reconnect',function(){
		console.log('user reconnected : '+(""+socket.id).red);
	});
	
});