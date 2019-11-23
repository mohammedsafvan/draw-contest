// ---InitialINITIAL VARIABLES---
var socket = io();

//Canvas stuff
var canvas = document.getElementById('canvas');
canvasResolution = 1000;
canvas.width = canvasResolution;
canvas.height = canvasResolution;
var ctx = canvas.getContext('2d');
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.lineWidth = 10;
ctx.strokeStyle = "#000";

var isDrawing = false;
var lastX = 0;
var lastY = 0;
var text = document.getElementById("input_text");
var userlist = document.getElementById('userlist');
var username;
var canDraw = false;
var currentWord = null;

// ---EVENT LISTENERs---
//Listen to mouse events
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [make_relative(e.offsetX), make_relative(e.offsetY)];
  });
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);

//Send message when enter is pressed
text.addEventListener('keydown', (e) => {
  if(e.keyCode==0x0D)
  send();
});

// ---SOCKET LISTENERS---
//Send initial info when connection
socket.on('init', function(conf){
  username = socket.id;
  console.log(conf);
  for (var i = 0; i < conf.usersOnline.length; i++) {
    userlist.value += (conf.usersOnline[i] + '\n');
  }
  socket.emit('connectInfo', {username:username});
});

//Add user to list when someone has connected
socket.on('newUser', function(newUser){
  userlist.value += (newUser + '\n');
});

//Update userlist when someone has disconnected
socket.on('someoneDisconnected', function(info){
  chat.value += (info.user) + " has disconnected";
  userlist.value = "";
  for (var variable in info.usersOnline) {
      userlist.value += (newUser + '\n');
  }
});

//// TODO: scroll to bottom
//Display new message in chat
socket.on('message', function(message){
  if (message.username == null){
    chat.value += (message.text + "\n");
  }
  else {
    chat.value += (message.username + ": " + message.text + "\n");
  }
});

//Says if a person is allowed to draw
socket.on('allowedToDraw', function(allowedToDraw){
  console.log(allowedToDraw);
  canDraw = allowedToDraw.bool;
  textPlace = document.getElementById('wordToDraw');
  if (canDraw) {
    currentWord = allowedToDraw.word;
    textPlace.textContent = "You are drawing: " + currentWord;
    //Make cursor 'pointer'
  }
  else {
    currentWord = null;
    textPlace.textContent = "";
    //Make cursor 'not-allowed'
  }
});

//Display new strokes when someone else draws
socket.on('stroke', function(stroke){
  ctx.beginPath();
  ctx.moveTo(stroke.lastX, stroke.lastY);
  ctx.lineTo(stroke.e.offsetX, stroke.e.offsetY);
  ctx.stroke();
  [lastX, lastY] = [stroke.e.offsetX, stroke.e.offsetY];
});

//Clear canvas after correct guess
socket.on('clearCanvas', function(clear){
  ctx.clearRect(0, 0, (canvas.width), (canvas.height))
});

// ---FUNCTIONS---
//Send message
function send() {
  var chat = document.getElementById('chat');
  if (text.value != "") {
    socket.emit('message', {text:text.value, username:username});
    text.value = '';
  }
}

function clearChatAndCanvas() {
  document.getElementById('chat').value = "";
  ctx.clearRect(0, 0, (canvas.width), (canvas.height))
}

function draw(e) {
    // stop the function if they are not mouse down or if not allowed to draw
    if(!isDrawing || !canDraw) return;
    //listen for mouse move event
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    var newX = make_relative(e.offsetX);
    var newY = make_relative(e.offsetY);
    ctx.lineTo(newX, newY);
    socket.emit('stroke', {lastX:lastX, lastY:lastY, e:{offsetX:newX, offsetY:newY}});
    ctx.stroke();
    [lastX, lastY] = [newX, newY];
  }

//adapt strokes for current canvas size
function make_relative(a){
  return(a*canvasResolution/canvas.clientWidth)
}
