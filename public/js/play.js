// ---INITIAL VARIABLES---
var socket = io();

//Canvas stuff
var canvas = document.getElementById('canvas');
canvasResolution = 1000;
canvas.width = canvasResolution*1.4;
canvas.height = canvasResolution;
var ctx = canvas.getContext('2d');
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.lineWidth = 10;
ctx.strokeStyle = '#000';

//Other variables
var isDrawing = false;
var lastX = 0;
var lastY = 0;
var input = document.getElementById('input_text');
var userlist = document.getElementById('userlist');
var username;
var canDraw = false;
var currentWord = null;
var chat = document.getElementById('chat_text');
var timer = document.getElementById('timer');
var timeLeft = -10;

// ---EVENT LISTENERS---
//Listen to mouse events
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [make_relative(e.offsetX), make_relative(e.offsetY)];
    draw(e);
  });
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);
//listen to touch events
canvas.addEventListener('touchstart', (e) => {
    isDrawing = true;
    var offset = canvas.getBoundingClientRect();
    lastX = make_relative(e.touches[0].clientX-offset.left);
    lastY = make_relative(e.touches[0].clientY-offset.top);
    draw(e);
  });
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', () => isDrawing = false);
canvas.addEventListener('touchcancel', () => isDrawing = false);
canvas.addEventListener('mouseout', () => isDrawing = false);

//Send message when enter is pressed
input.addEventListener('keydown', (e) => {
  if(e.keyCode==0x0D)
  send();
});

setInterval(function(){
  timeLeft -= 1;
  if (timeLeft < -0) {
    timer.innerHTML = '&nbsp';
  }
  else {
    timer.innerHTML = 'Time left: 0'+(Math.floor(timeLeft / 60)) + ':' + (('0'+(Math.floor(timeLeft % 60))).slice(-2));
  }
}, 1000);

// ---SOCKET LISTENERS---
//Send initial info when connection
socket.on('init', function(){
  askUsername();
  socket.emit('connectInfo', {username:username, room:sessionStorage.getItem('room'), maxPoints:sessionStorage.getItem('maxPoints')});
});
socket.on('history', function(conf){
  ctx.clearRect(0, 0, (canvas.width), (canvas.height))
  for (var i = 0; i < conf.history.length; i++){
    event = conf.history[i]
    if (event.lastX != undefined){
      ctx.beginPath();
      ctx.moveTo(event.lastX, event.lastY);
      ctx.lineTo(event.offsetX, event.offsetY);
      ctx.stroke();
    }
    else{
      ctx.strokeStyle =  event.color;
      ctx.lineWidth =  event.size;
    }
  }

  ctx.lineWidth = conf.brushSize;
  ctx.strokeStyle = conf.brushColor;
});



socket.on('disconnect', (reason) => {
  addToChat('You have disconnected', null);
  userlist.innerHTML = '';
});

//Display new message in chat
socket.on('message', function(message){
  addToChat(message.text, message.username);
  // textbox = document.getElementById('textbox');
  // textbox.scrollTop = textbox.scrollHeight;
});

//If you are the drawer show brush tools and your word, otherwise hide them
socket.on('allowedToDraw', function(allowedToDraw){
  canDraw = allowedToDraw.bool;
  textPlace = document.getElementById('wordToDraw');
  var belowCanvas = document.getElementById('belowCanvas');
  var chat_input = document.getElementById('chat_input');
  document.getElementById('input_text').value = '';
  var modifyers = document.getElementsByClassName('brush_modifyer');
  if (canDraw) {
    input.disabled = true;
    currentWord = allowedToDraw.word;
    textPlace.textContent = 'Your word is: ' + currentWord;
    addToChat('You are drawing: ' + currentWord, null);
    belowCanvas.style.display = 'flex';
    chat_input.style.display = 'none';
    for (i = 0; i < modifyers.length; i++) {
      modifyers[i].style.display = 'inline';
    };
    //Make cursor 'pointer'
  }
  else if (allowedToDraw.user == null) {
    input.disabled = false;
    currentWord = null;
    textPlace.textContent = ' ';
    belowCanvas.style.display = 'none';
    chat_input.style.display = 'inline-block';
    for (i = 0; i < modifyers.length; i++) {
      modifyers[i].style.display = 'none';
    };
  }
  else if (allowedToDraw.user.id != socket.id){
    input.disabled = false;
    addToChat(allowedToDraw.user.htmlusername + ' is drawing', null);
    currentWord = null;
    textPlace.textContent = ' ';
    belowCanvas.style.display = 'none';
    chat_input.style.display = 'inline-block';
    for (i = 0; i < modifyers.length; i++) {
      modifyers[i].style.display = 'none';
    };
    //TODO: Make cursor 'not-allowed'
  }
});

//Display new strokes when someone else draws
socket.on('stroke', function(stroke){
  ctx.beginPath();
  ctx.moveTo(stroke.lastX, stroke.lastY);
  ctx.lineTo(stroke.offsetX, stroke.offsetY);
  ctx.stroke();
  [lastX, lastY] = [stroke.offsetX, stroke.offsetY];
});

//Clear canvas after correct guess
socket.on('clearCanvas', function(clear){
  ctx.clearRect(0, 0, (canvas.width), (canvas.height))
});

socket.on('changeBrush', function(brush) {
  ctx.strokeStyle =  brush.color;
  ctx.lineWidth =  brush.size;
  modifyers = document.getElementsByClassName('brush_modifyer');
  for (var i = 0; i < modifyers.length; i++) {
    modifyers[i].style.border = '2px solid #000';
  }
  document.getElementById(brush.color).style.border = '2px solid #FFF';
  document.getElementById('px' + brush.size.toString()).style.border = '2px solid #FFF';
});

socket.on('timeLeft', function(time) {
  timeLeft = time.time;
  if (timeLeft > -1) {
    timer.style.display = 'block';
  }
});

socket.on('scoreBoard', function(scoreBoard) {
  userlist.innerHTML = '<tr>\n<th>Name</th>\n<th style="width:4em">Points</th></tr>';
  for (var i = 0; i < scoreBoard.length; i++) {
    var row = document.createElement('tr');
    var name = document.createElement('td');
    name.innerHTML = scoreBoard[i].htmlusername;
    var points = document.createElement('td');
    points.innerHTML = (scoreBoard[i].drawerPoints + scoreBoard[i].guesserPoints)
    row.appendChild(name);
    row.appendChild(points);
    userlist.appendChild(row);
  }
})
// ---FUNCTIONS---
//Send message
function send() {
  if (input.value != '') {
    socket.emit('message', {text:input.value, username:username});
    input.value = '';
  }
}

function changeColor(newColor) {
  socket.emit('changeBrush', {color:newColor, size:ctx.lineWidth});
}
function changeBrushSize(newSize) {
  socket.emit('changeBrush', {color:ctx.strokeStyle.toUpperCase(), size:newSize});
}

function clearCanvas() {
  socket.emit('clearCanvas');
}

function draw(e) {
    // stop the function if they are not mouse down or if not allowed to draw
    if(!isDrawing || !canDraw) return;
    //listen for mouse move event
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    if(e.touches!=undefined){
      var offset = canvas.getBoundingClientRect();
      newX = make_relative(e.touches[0].clientX-offset.left);
      newY = make_relative(e.touches[0].clientY-offset.top);
    }
    else {
      var newX = make_relative(e.offsetX);
      var newY = make_relative(e.offsetY);
    }
    ctx.lineTo(newX, newY);
    socket.emit('stroke', {lastX:lastX, lastY:lastY, offsetX:newX, offsetY:newY});
    ctx.stroke();
    [lastX, lastY] = [newX, newY];
  }

//adapt strokes for current canvas size
function make_relative(a){
  return(a*canvasResolution/canvas.clientHeight)
}

function addToChat(text, user){
  var p = document.createElement('p');
  if (user == null){
    p.innerHTML = (' &#8226 ' + text);
  }
  else {
    p.innerHTML = ' &#8226 ' + user + ': ' + text;
  }
  p.classList.add('hide');
  chat.prepend(p);
  setTimeout(function(){
    p.classList.add('show');
    p.classList.remove('hide');
  }, 10);
}

// TODO: make popup with modifyers
function show_colors(){
  window.scrollBy({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
  setTimeout(function () {
    window.scrollTo(0,document.body.scrollHeight);
  }, 500);
  // color_modifyers = document.getElementById('colors').style;
  // color_modifyers.display = 'inline-block';
  // color_modifyers.position = 'fixed';
  // color_modifyers.left = '50%';
  // color_modifyers.top = '50%';
  // color_modifyers.transform = 'translate(-50%, -50%)';
}
function hide_colors(){
}
function show_sizes(){
  window.scrollBy({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
  setTimeout(function () {
    window.scrollTo(0,document.body.scrollHeight);
  }, 500);
}
function hide_sizes(){
}
function askUsername(){
  username = sessionStorage.getItem('username');
  var backupUsername = socket.id.substring(0, 5);
  if (username == undefined || username == '' || username == null){
    username = window.prompt('What is your username?',backupUsername);
    if (username == undefined || username == '' || username == null){
      username = backupUsername;
    }
    else {
      sessionStorage.setItem('username', username);
    }
  }
}
