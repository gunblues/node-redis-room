var debug = require('debug')('nodeRedisRoomExample'),
  async = require('async'),
  redis = require('redis'),
  nodeRedisRoom = require('node-redis-room');

  var crud = redis.createClient();
  var sub = redis.createClient();
  var pub = redis.createClient();

  nodeRedisRoom.init(crud, sub, pub, function(channel, message) {
    debug("io emit %o %o", channel, message);
    io.in(channel).emit(message.cmd, message.content);
  });

// export function for listening to the socket
module.exports = function (socket) {
  var user = JSON.parse(decodeURIComponent(socket.handshake.query.user));
  debug("user connected %o", user);
 
  var nodeRedisRoomUser = {
    id: user.id,
    connectionId: socket.id,
    nick: user.nick,
    avatar: user.avatar
  };
 
  socket.on('join', function (data) {
    debug("user join %o %o", user, data);
  
    async.auto({
      socket_join: function (cb) {
        socket.join(data.roomName, function (err) {
          if (err) {
            cb(err);
          } else {
            debug("user socket.join success %o", user, data);
            cb();
          }
        });
      },  
      redisRoom: ['socket_join', function(cb, results) {
        nodeRedisRoom.join(data.roomName, nodeRedisRoomUser, function(err) {
          if (err) {
            cb(err);
          } else {
            debug("user nodeRedisRoom.join success %o", user);
            cb();
          }
        });  
      }],
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
      socket_leave: function (cb) {
        socket.leave(data.roomName, function (err) {
          if (err) {
            cb(err);
          } else {
            debug("user socket.leave success %o", user, data);
            cb();
          }
        });
      },  
      redisRoom: ['socket_leave', function(cb, results) {
        nodeRedisRoom.leave(data.roomName, nodeRedisRoomUser, function(err) {
          if (err) {
            cb(err);
          } else {
            debug("user nodeRedisRoom.leave success %o", user);
            cb();
          }
        });  
      }],
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
      io.in(data.roomName).emit('getRoomMembers', users);
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
