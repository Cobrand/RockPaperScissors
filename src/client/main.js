"use strict";

var moment = require('moment');
var io = require('socket.io-client'),
    SOCKET ,
	playerDivs = {} ;
var loghistory = [] ;

var paper = document.getElementById("paper"), rock = document.getElementById("rock"), scissors = document.getElementById("scissors") ;
window.onload = function(){	
    var pathname = window.location.pathname.split("/").slice(1) ;
	if (pathname[0] === "room" ){
		if (pathname[1] != null && pathname[1] != ""){
			connect(pathname[1]);
		}else{
			window.location.pathname = "/" ;
		}
	}
	else{
		document.getElementById("main").innerHTML = 
			"Welcome to Rock Paper Scissors ! To join or create a room,"+"<br>"
			+"To join or create a room, go to <i>http://"+window.location.hostname+"/room/[NAMEOFYOURROOM]</i> and share the URL with your friends !"
		;	
	}
}

function headerMsg(msg){
	document.getElementById("status").innerHTML = msg ;
}

function addLog(msg,timestamp){
	var span = document.createElement("div") ;
	span.classList.add("log");
	//console.log(typeof timestamp);
	span.innerHTML =  "<span class='date'>["+moment(timestamp).format("LTS")+"]</span>" + msg ;
	document.getElementById("history").appendChild(span);
}

function cleanPlayers(){
	playerDivs = {} ;
	document.getElementById("players").innerHTML = "" ;
}

function updateLogs(history){
	history.slice(loghistory.length).forEach(function(m){
		loghistory.push(m);
		addLog(m.msg,m.timestamp);
	});
}

function createPlayers(players){
	for (var playerid in players){
		var p = players[playerid] ;
		var player_status , color ;
		if (p.selected === true){
			color = "grey";
			player_status = "DONE" ;
		}else if(p.selected === false){
			color = "white";
			player_status = "SELECTING ..." ;
		}
		
		addPlayer(p.name,p.score,player_status,color);
	}
}

function addPlayer(name,score,status,color){
	var players = document.getElementById("players");
	var player = document.createElement("div");
	player.classList.add("player");
	player.setAttribute("name",name);
	var score_span = document.createElement("span");
	score_span.classList.add("score");
	score_span.textContent = score ;
	var username_span = document.createElement("span");
	username_span.classList.add("username");
	username_span.textContent = name ;
	var status_span = document.createElement("span");
	status_span.classList.add("status");
	status_span.textContent = status.toUpperCase();
	player.appendChild(score_span);
	player.appendChild(username_span);
	player.appendChild(status_span);
	players.appendChild(player);
	player.classList.add(color);
	playerDivs[name] = player ;
}

function updatePlayers(players){
	for (var pid in players){
		var p = players[pid] ;
		var player_div = playerDivs[players[pid].name] ;
		var status = null ;
		if (p.selected === "paper"){
			status = "PAPER" ;
		}else if (p.selected === "rock"){
			status = "ROCK" ;
		}else if (p.selected === "scissors"){
			status = "SCISSORS" ;
		}
		player_div.getElementsByClassName("status")[0].textContent = status ;
		
		var color ;
		if (p.win === 0){
			color = "grey" ;	
		}else if (p.win > 0){
			color = "green" ;
		}else if (p.win < 0){
			color = "red" ;
		}
		player_div.classList.remove("grey");
		player_div.classList.remove("red");
		player_div.classList.remove("green");
		player_div.classList.remove("white");
		player_div.classList.add(color);
		player_div.getElementsByClassName("score")[0].textContent = p.score ;
	}
}

function connect(roomid){
	SOCKET = io() ;
	var username = sessionStorage.getItem("username") || "";
	while (username == ""){
		username = prompt("Enter a username","");
	}
	if (username == "" || username == null  ){ username = Math.floor(Math.random() * 0xFFFFFF).toString(16); }// if someone disabled prompts
	sessionStorage.setItem("username",username);
	
	SOCKET.emit("login",{username:username,room:roomid});
	
	SOCKET.on("loginanswer",function(msg){
		if (msg.status == "ROOMFULL"){
			headerMsg("Room "+decodeURI(roomid)+" is full :( ");	
		}else if(msg.status == "OK"){
			headerMsg("Room "+decodeURI(roomid));
			createPlayers(msg.players);
		}
	});
	
	SOCKET.on("update",function(msg){
		cleanPlayers()
		createPlayers(msg.players);
		updateLogs(msg.history);
	});
	
	SOCKET.on("result",function(msg){
		updatePlayers(msg.players);
		updateLogs(msg.history);
	});
	
	paper.addEventListener("click",function(){
		SOCKET.emit("select","paper");
		paper.classList.add("selected");
		rock.classList.remove("selected");
		scissors.classList.remove("selected");
	});
	
	rock.addEventListener("click",function(){
		SOCKET.emit("select","rock");
		paper.classList.remove("selected");
		rock.classList.add("selected");
		scissors.classList.remove("selected");
	});
	
	scissors.addEventListener("click",function(){
		SOCKET.emit("select","scissors");
		paper.classList.remove("selected");
		rock.classList.remove("selected");
		scissors.classList.add("selected");
	});
}

