# node-redis-room
Use Rooms and Namespaces of Socket.IO across nodes

Rooms and Namespaces of Socket.IO is very easy to use for implementing chat, cooperation etc. 
If you want to use it in multi node, you will find you cannot get the list of connected clients in a particular room ( https://github.com/socketio/socket.io-redis/issues/13 , https://github.com/socketio/socket.io-redis/pull/15 )

Someday I got inspired on this project ( https://github.com/rajaraodv/redispubsub ) so I try to implement a library that is easy to use for someone need to use rooms of socket.io across node.

## Installation

```bash
npm install node-redis-room
```

## Usage

##### Server side #####


###### init ######
```javascript
var redis = require('redis'),
  nodeRedisRoom = require('node-redis-room');
  
  var crud = redis.createClient();
  var sub = redis.createClient();
  var pub = redis.createClient();

  //callback will be trigger when sub on message so I can emit it back at every node
  nodeRedisRoom.init(crud, sub, pub, function(roomName, message) {
    io.in(roomName).emit(message.cmd, message.content);
  });
  
  //prepare user object for nodeRedisRoom
  var nodeRedisRoomUser = {
    id: user.id, //necessary
    connectionId: socket.id, //necessary
    nick: user.nick,
    avatar: user.avatar
  };  
```

###### join ######
```javascript
//You still need to call socket.join for io.in(roomName).emit in every node. You can see the usage in the example
nodeRedisRoom.join(roomName, nodeRedisRoomUser, function(err) {});
```

###### leave ######
```javascript
//You still need to call socket.leave for io.in(roomName).emit in every node. You can see the usage in the example
nodeRedisRoom.leave(roomName, nodeRedisRoomUser, function(err) {});
```

###### broadcast ######
```javascript
//the command that you need to brocast to other users
nodeRedisRoom.broadcast(roomName, {
  cmd: 'join',
  content: nodeRedisRoomUser
});
```

###### getRoomMembers ######
```javascript
  nodeRedisRoom.getRoomMembers(roomName, function(err, users) {});
```

###### getUserHaveJoinedRooms ######
```javascript
  nodeRedisRoom.getUserHaveJoinedRooms(socket.id, function(err, rooms) {});
```

###### onDisconnect ######
```javascript
  //need to call it when socket disconnect for clearing the user data in redis
  nodeRedisRoom.onDisconnect(nodeRedisRoomUser, function() {});
```

## Example
##### Run from source #####
* start your redis server
* cd node-redis-room/example
* npm install
* DEBUG="nodeRedisRoomExample, nodeRedisRoom" node app.js
##### test from website #####
* http://nrre.gunblues.com:3000/
