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

var me = User.get();

var UIOperate = (function() {
  var addUserToFriendList = function(user) {
    if ($('#' + user.id).length != 0) {
      return;
    }

    var nick = user.nick;
    if (user.id === me.id) {
      nick = nick + ' (it\'s you)'; 
      $('.friend-list').append('<li id="userOfMe"><a href="#" class="clearfix"><img src="' + user.avatar + '" alt="" class="img-circle"><div class="friend-name"><strong>' + nick + '</strong></div></a></li>');
    } else {
      $('#userOfMe').after('<li id="' + user.id + '"><a href="#" class="clearfix"><img src="' + user.avatar + '" alt="" class="img-circle"><div class="friend-name"><strong>' + nick + '</strong></div></a></li>');
    }

  };

  var removeUserFromFriendList = function(user) {
    $('#' + user.id).remove();
  };

  var send = function(text) {
    var text = $('#send-text').val();      
    if (text === '')
      return;

    $('#send-text').val('');

    var message = {
      user: me,
      text: text
    };

    socketGo.broadcast(message);
  };

  var addChatToChatMessage = function(user, text) {
    var direction = 'left';
    if (user.id === me.id) {
      direction = 'right';
    } else {
      $('#' + user.id).remove();
      $('#userOfMe').after('<li id="' + user.id + '"><a href="#" class="clearfix"><img src="' + user.avatar + '" alt="" class="img-circle"><div class="friend-name"><strong>' + user.nick + '</strong></div></a></li>');
    }

    var re = /<script[^>]*>[\d\D]*?<\/script>/ig;
    text = text.replace(re, '');

    $('.chat').append('<li class="' + direction + ' clearfix"><span class="chat-img pull-' + direction + '"><img src="' + user.avatar + '" alt="User Avatar"></span><div class="chat-body clearfix"><div class="header"><strong class="primary-font">' + user.nick + '</strong></div><p>' + text + '</p></div></li>');
  };

  return {
    addUserToFriendList: addUserToFriendList ,
    addChatToChatMessage: addChatToChatMessage,
    removeUserFromFriendList: removeUserFromFriendList,
    send: send
  };
}());

var socketGo = (function() {

  var roomName = "node-redis-room-example";
  var options = {
    query: 'user=' + encodeURIComponent(JSON.stringify(me)),
    forceNew: true 
  };

  var socket = io.connect('http://localhost:3000', options);

  socket.on('connect', function () {
    console.log('got connected', socket.id);
    //join room
    socket.emit('join', {
      roomName: roomName
    });
  });

  socket.on('join', function (data) {
    console.log('got join', data);

    if (data.id === me.id) {
      UIOperate.addUserToFriendList(me);
      getRoomMembers();
    } else {
      UIOperate.addUserToFriendList(data);
    }

  });

  socket.on('leave', function (data) {
    console.log('got leave', data);
      
    UIOperate.removeUserFromFriendList(data);
  });

  socket.on('broadcast', function (data) {
    console.log('got broadcast', data);

    UIOperate.addChatToChatMessage(data.user, data.text);
  });

  socket.on('getRoomMembers', function (data) {
    console.log('got getRoomMembers', data);

    $.each(data, function(id, member) {
      if (member.id !== me.id) {
        UIOperate.addUserToFriendList(member);
      }
    });
  });

  var broadcast = function(data) {
    socket.emit('broadcast', {
      roomName: roomName,
      message: data 
    });
  };

  var leave = function() {
    socket.emit('leave', {
      roomName: roomName
    });
  };

  var getRoomMembers = function() {
    socket.emit('getRoomMembers', {
      roomName: roomName
    });
  };

  var disconnect = function() {
    leave();
    socket.disconnect();
  };

  return {
    broadcast: broadcast,
    leave: leave,
    disconnect: disconnect
  }

}());

$(window).unload(function() {
  socketGo.disconnect();
});

$(document).keypress(function(e) {
  if(e.which == 13 && $('#send-text').is(":focus")) {
    UIOperate.send();
  }
});
