var debug = require('debug')('nodeRedisRoom'),
    async = require('async');

exports.nodeRedisRoom = function () {
    var redisPrefix = "nodeRedisRoom:",
        redisPrefixUserHaveJoinedRooms = redisPrefix + "UserJoined:",
        _crud,
        _sub,
        _pub;

    function init(crud, sub, pub, callback) {
        debug('init %o %o %o', crud, sub, pub);
        _crud = crud; 
        _sub = sub;
        _pub = pub;

        _sub.on('message', function (channel, message) {
            debug('sub message %s %s', channel, message);
            callback(channel, JSON.parse(message));
        });
    }

    function validateUser(userObj, cb) {
        if (!userObj) {
            cb('invalid user object');
        } else if (!userObj.id) {
            cb('invalid user id');
        } else if (!userObj.connectionId) {
            cb('invalid user connection id');
        } else {
            cb(null);
        }
    }

    function join(roomName, userObj, callback) {
        debug('join %s %o', roomName, userObj);
        async.auto({
            validate: function (cb) {
                validateUser(userObj, function (err) {
                    if (err) {
                        cb(err);
                        return;
                    }

                    cb(null);
                });
            },
            join_room: ['validate', function (cb) {
                _crud.sadd([redisPrefix + roomName, JSON.stringify(userObj)], function (err, reply) {
                    if (err) {
                        debug('join join_room but sadd failed %o', err);
                        cb(err);
                    } else {
                        debug('join join_room and sadd success %o', reply);
                        cb();
                    }
                });
            }],
            save_user_have_joined_rooms: ['join_room', function (cb) {
                _crud.sadd([redisPrefixUserHaveJoinedRooms + userObj.connectionId, roomName], function (err, reply) {
                    if (err) {
                        debug('join save_user_have_joined_rooms but sadd failed %o', err);
                        cb(err);
                    } else {
                        debug('join save_user_have_joined_rooms and sadd success %o', reply);
                        cb();
                    }
                });
            }],
            subscribe: ['save_user_have_joined_rooms', function (cb) {
                _sub.subscribe(roomName);
                debug('join subscribe %s success', roomName);
                cb(null);
            }],
        }, function final(err, results) {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
        });
    }

    function getUserHaveJoinedRooms(connectionId, callback) {
        debug('getUserHaveJoinedRooms %s', connectionId);

        _crud.smembers(redisPrefixUserHaveJoinedRooms + connectionId, function (err, reply) {
          if (err) {
            debug('getUserHaveJoinedRooms but smembers failed %o', err);
            callback(err);
          } else {
            debug('getUserHaveJoinedRooms and smembers success %o', reply);
            callback(null, reply);
          }
        });
    }

    function getRoomMembers(roomName, callback) {
        debug('getRoomMembers %s', roomName);

        _crud.smembers(redisPrefix + roomName, function (err, reply) {
          if (err) {
            debug('getRoomMembers but smembers failed %o', err);
            callback(err);
          } else {
            debug('getRoomMembers and smembers success %o', reply);
            var map = {};

            reply.forEach(function (member) {
                var user = JSON.parse(member);
                map[user.id + user.connectionId] = user;

            });
            callback(null, users);
          }
        });
    }

    function getRoomMembersOfUserId(roomName, callback) {
        debug('getRoomMembersOfUserId %s', roomName);

        async.auto({
            get_members: function (cb) {
                _crud.smembers(redisPrefix + roomName, function (err, reply) {
                  if (err) {
                    debug('getRoomMembersOfUserId but smembers failed %o', err);
                    cb(err);
                  } else {
                    debug('getRoomMembersOfUserId and smembers success %o', reply);
                    cb(null, reply);
                  }
                });
            },
            uniq_by_userid: ['get_members', function(cb, results) {
                debug('getRoomMembersOfUserId uniq_by_userid');
                var map = {};

                results.get_members.forEach(function (member) {
                    var user = JSON.parse(member);
                    map[user.id] = user;
                });

                cb(null, map);
            }],
         }, function final(err, results) {
            if (err) {
                callback(err);
            } else {
                callback(null, results.uniq_by_userid);
            }
        });
    }

    function broadcast(roomName, message) {
        debug('broadcast %s %o', roomName, message);
        
        _pub.publish(roomName, JSON.stringify(message));
    }

    function leave(roomName, userObj, callback) {
        debug('leave %s %o', roomName, userObj);
        async.auto({
            validate: function (cb) {
                validateUser(userObj, function (err) {
                    if (err) {
                        cb(err);
                        return;
                    }

                    cb(null);
                });
            },
            leave_room: ['validate', function (cb) {
                _crud.srem([redisPrefix + roomName, JSON.stringify(userObj)], function (err, reply) {
                    if (err) {
                        debug('leave leave_room but srem failed %o', err);
                        cb(err);
                    } else {
                        debug('leave leave_room and srem success %o', reply);
                        cb();
                    }
                });
            }],
            remove_user_have_joined_rooms: ['leave_room', function(cb, results) {
                _crud.srem([redisPrefixUserHaveJoinedRooms + userObj.connectionId, roomName], function (err, reply) {
                    if (err) {
                        debug('leave remove_user_have_joined_rooms but srem failed %o', err);
                        cb(err);
                    } else {
                        debug('leave remove_user_have_joined_rooms and srem success %o', reply);
                        cb();
                    }
                });
            }],
            unsubscribe: ['remove_user_have_joined_rooms', function (cb) {
                _sub.unsubscribe(roomName);
                cb();
            }],
        }, function final(err) {
            if (err) {
                callback(err);
            } else {
                callback();
            }
        });
    }

    function onDisconnect(userObj, callback) {
        debug('onDisconnect %o', userObj);
        async.auto({
            validate: function (cb) {
                validateUser(userObj, function (err) {
                    if (err) {
                        cb(err);
                        return;
                    }

                    cb(null);
                });
            },
            get_join_room: ['validate', function (cb) {
              _crud.smembers(redisPrefixUserHaveJoinedRooms + userObj.connectionId, function (err, reply) {
                if (err) {
                  cb(err);
                } else {
                  cb(null, reply);
                }
              });
            }],
            leave_room: ['get_join_room', function (cb, results) {
                results.get_join_room.forEach(function (room) {
                    _crud.srem([redisPrefix + room, JSON.stringify(userObj)], function (err, reply) {
                        if (err) {
                            debug('onDisconnect leave_room but srem failed %o', err);
                        } else {
                            debug('onDisconnect leave_room and srem success %o', reply);
                        }
                    });

                    _sub.unsubscribe(room);

                });

                cb();
            }],
            del_join_room: ['leave_room', function (cb, results) {
                _crud.del(redisPrefixUserHaveJoinedRooms + userObj.connectionId, function (err, reply) {
                    if (err) {
                        debug('onDisconnect del_join_room but del failed %o', err);
                        cb(err);
                    } else {
                        debug('onDisconnect del_join_room and del success %o', reply);
                        cb();
                    }
                });
            }],
            clear: ['del_join_room', function (cb, results) {
                _sub.unsubscribe();
                cb();
            }]
        }, function final(err, results) {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
        });
    }

    return {
        init: init,
        join: join,
        leave: leave,
        getUserHaveJoinedRooms: getUserHaveJoinedRooms,
        getRoomMembers: getRoomMembers,
        getRoomMembersOfUserId: getRoomMembersOfUserId,
        broadcast: broadcast,
        onDisconnect: onDisconnect
    };
};
