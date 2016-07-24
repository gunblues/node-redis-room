var User = (function() {

  var guid = function() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  };

  var nicks = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];
  
  nick = nicks[Math.floor(Math.random()*nicks.length)];
  
  var user = {
    id: guid(),
    nick: nick + Date.now(),
    avatar: 'img/' + nick + '.png',
  };
  
  var get = function() {
    return user;
  };

  return {
    get: get
  }
    
}());

var socketGo = (function() {

  var options = {
    query: 'user=' + encodeURIComponent(JSON.stringify(User.get())),
    forceNew: true 
  };

  var socket = io.connect('http://localhost:3000', options);

  socket.on('connect', function () {
    console.log('got connected', socket.id);
    //join room
    socket.emit('join', {
      roomName: "node-redis-room-example"
    });
  });

  socket.on('join', function (data) {
    console.log(data);
  });

  socket.on('leave', function (data) {
    console.log(data);
  });

  socket.on('broadcast', function (data) {
    console.log(data);
  });

  var disconnect = function() {
    socket.emit('leave', {
      roomName: "node-redis-room-example"
    });
    socket.disconnect();
  };

}());

$(window).unload(function() {
  socketGo.disconnect();
});
