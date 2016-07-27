var debug = require('debug')('nodeRedisRoomExample'),
  async = require('async');

// export function for listening to the socket
module.exports = function (socket) {
  var user = JSON.parse(decodeURIComponent(socket.handshake.query.user));
  debug("user connected %o", user);

  ///prepare user object for nodeRedisRoom
  var nodeRedisRoomUser = {
    id: user.id, //necessary
    connectionId: socket.id, //necessary
    nick: user.nick,
    avatar: user.avatar
  };
 
  socket.on('join', function (data) {
    debug("user join %o %o", user, data);
  
    async.auto({
      redisRoom: function(cb, results) {
        nodeRedisRoom.join(socket, data.roomName, nodeRedisRoomUser, function(err) {
          if (err) {
            cb(err);
          } else {
            debug("user nodeRedisRoom.join success %o", user);
            cb();
          }
        });  
      },
      broadcast: ['redisRoom', function(cb, results) {
        nodeRedisRoom.broadcast(data.roomName, {
          cmd: 'join',
          content: nodeRedisRoomUser
        });
        cb();
      }],
    }, function final(err) {
      if (err) {
        console.error('join failed', err);
      }
    });
  });

  socket.on('leave', function (data) {
    debug("user leave %o %o", user, data);
  
    async.auto({
      redisRoom: function(cb, results) {
        nodeRedisRoom.leave(socket, data.roomName, nodeRedisRoomUser, function(err) {
          if (err) {
            cb(err);
          } else {
            debug("user nodeRedisRoom.leave success %o", user);
            cb();
          }
        });  
      },
      broadcast: ['redisRoom', function(cb, results) {
        nodeRedisRoom.broadcast(data.roomName, {
          cmd: 'leave',
          content: nodeRedisRoomUser
        });
        cb();
      }],
    }, function final(err) {
      if (err) {
        console.error('leave failed', err);
      }
    });
  });

  socket.on('broadcast', function (data) {
    debug("user broadcast %o %o", user, data);
 
    nodeRedisRoom.broadcast(data.roomName, {
      cmd: 'broadcast',
      content: data.message 
    });

  });

  socket.on('getRoomMembers', function (data) {
    debug("user getRoomMembers %o %o", user, data);
 
    nodeRedisRoom.getRoomMembers(data.roomName, function(err, users) {
      if (err) {
        console.error('getRoomMembers failed', err);
        return;
      }
      io.to(socket.id).emit('getRoomMembers', users);
    });

  });

  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function () {
    debug("user disconnected %o", user);

    async.auto({
      leave_room: function (cb) {
        nodeRedisRoom.getUserHaveJoinedRooms(socket.id, function(err, rooms) {
          if (err) {
            cb(err);
            return;
          } 

          rooms.forEach(function(room) {
            nodeRedisRoom.broadcast(room, {
              cmd: 'leave',
              content: nodeRedisRoomUser
            });
          });
        });
      },
      redisRoom: ['leave_room', function (cb) {
        nodeRedisRoom.onDisconnect(nodeRedisRoomUser, function() {
          cb();
        });
      }],
    }, function final(err) {
      if (err) {
        console.error('leave failed', err);
      }
    });
  });
};
