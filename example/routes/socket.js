var debug = require('debug')('nodeRedisRoomExample'),
  async = require('async'),
  redis = require('redis'),
  nodeRedisRoom = require('node-redis-room');

  var crud = redis.createClient();
  var sub = redis.createClient();
  var pub = redis.createClient();

  nodeRedisRoom.init(crud, sub, pub, function(channel, message) {
    io.in(channel).emit(message.cmd, message.content);
  });

// export function for listening to the socket
module.exports = function (socket) {
  var user = JSON.parse(decodeURIComponent(socket.handshake.query.user));
  debug("user connected %o", user);
 
  var nodeRedisRoomUser = {
    id: user.id,
    connectionId: socket.id,
    nickname: user.nick,
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
            cb(null);
          }
        });
      },  
      redisRoom: ['socket_join', function(cb, results) {
        nodeRedisRoom.join(data.roomName, nodeRedisRoomUser, function(err) {
          if (err) {
            cb(err);
          } else {
            debug("user nodeRedisRoom.join success %o", user);
            cb(null);
          }
        });  
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
            cb(null);
          }
        });
      },  
      redisRoom: ['socket_leave', function(cb, results) {
        nodeRedisRoom.leave(data.roomName, nodeRedisRoomUser, function(err) {
          if (err) {
            cb(err);
          } else {
            debug("user nodeRedisRoom.leave success %o", user);
            cb(null);
          }
        });  
      }],
    }, function final(err) {
      if (err) {
        console.error('leave failed', err);
      }
    });
  });

  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', function () {
    debug("user disconnected %o", user);
    nodeRedisRoom.onDisconnect(nodeRedisRoomUser, function() {});
  });
};
