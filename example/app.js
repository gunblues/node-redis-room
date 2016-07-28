var http = require('http'),
  express = require('express'),
  app = express(),
  server = http.createServer(app),
  io = require('socket.io').listen(server, {
    pingTimeout: 60000,
    pingInterval: 10000
  }),
  redis = require('redis'),
  socketioRedis = require('socket.io-redis'),
  routes = require('./routes'),
  socket = require('./routes/socket.js'),
  nodeRedisRoom = require('node-redis-room');

io.adapter(socketioRedis({ host: 'localhost', port: 6379 }));

var crud = redis.createClient();
var sub = redis.createClient();
var pub = redis.createClient();

nodeRedisRoom.init(io, crud, sub, pub);

GLOBAL.io = io;
GLOBAL.nodeRedisRoom = nodeRedisRoom;

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(express.static(__dirname + '/public'));

// Routes
app.get('/', routes.index);

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);

// Socket.io Communication
io.sockets.on('connection', socket);

// Start server
server.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", server.address().port, app.settings.env);
});
