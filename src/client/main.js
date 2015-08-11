"use strict";

var io = require('socket.io-client'),
    SOCKET ;
window.onload = function(){
    SOCKET = io() ; ;
}

