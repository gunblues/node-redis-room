var http = require('http'),
  express = require('express'),
  app = express(),
  server = http.createServer(app),
  io = require('socket.io').listen(server),
  redis = require('socket.io-redis'),
  routes = require('./routes'),
  socket = require('./routes/socket.js');

io.adapter(redis({ host: 'localhost', port: 6379 }));

GLOBAL.io = io;

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
