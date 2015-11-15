var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var blog = require('./routes/blog');
var chat = require('./routes/chat');
var event = require('./routes/event');
var twitter = require('./routes/twitter');
var user = require('./routes/user');
/**
 *  Connect to Database
 */
var config = require('./config/db_config');
var mongoose = require('mongoose');
var options = {};
mongoose.connect(config.mongodbURL, options, function (err, res) {
    if (err) {
        console.log('Connection refused to ' + config.mongodbURL);
        console.log(err);
    } else {
        console.log('Connection successful to: ' + config.mongodbURL);
    }
});
var redis = require('redis');
var redisClient = redis.createClient();
/**
 * Create Server
 */
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

// view engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Define Routes
 */
app.all('/*', function(req, res, next) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Credentials', true);
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
    next();
});
app.get('/', function (req, res) {
    res.render('index');
});
//app.use('/api/', index);
//app.use('/api/blog', blog);
//app.use('/api/chat', chat);
//app.use('/api/event', event);
app.use('/api/twitter', twitter);
app.use('/api/user', user);

/**
 * Chat Room
 */

var storeMessage = function(name, data) {
    var message = JSON.stringify({name: name, data: data}); // need to turn object into string to store in redis
    redisClient.lpush("messages", message, function(err, response) {
        redisClient.ltrim("messages", 0, 9); // keeps newest 10 items
    });
};
io.on('connection', function(client) {// Remember, the callback function takes one argument, which is the client object that has connected.
    console.log('Client connected...');
    // When a question is submitted to our server, we want to broadcast it out to all the connected clients so they can have a chance to answer it.
    client.on('question', function(question) {
        if (!client.question_asked) {
            client.question_asked = true;
            client.broadcast.emit('question', question);
            // Finally, when a client emits a 'question' event, check to make sure question_asked is not already set to true. We only want to allow one question per user,
            // so make sure that we only set the value of question_asked and broadcast the question to other clients when the value of question_asked is not already true.
            redisClient.lpush('questions', question);
        }
    });
    client.on('answer', function(question, answer) {
        client.broadcast.emit('answer', question, answer);
    });
    client.on('join', function(name) {
        client.nickname = name;
        client.broadcast.emit("add chatter", name); // notify other clients a chatter has joined
        redisClient.lrange("messages", 0, -1, function(err, messages) {
            messages = messages.reverse();
            messages.forEach(function(msg) {
                msg = JSON.parse(msg);
                client.emit("messages", msg.name + ": " + msg.data);
            });
        });
        redisClient.smembers('names', function(err, names) {
            names.forEach(function(name) {
                client.emit('add chatter', name); // emit all the currently logged in chatters to the newly connected client
            });
        });

        redisClient.sadd("chatters", name); // add name to chatters set
    });
    client.on('messages', function (msg) {
        var nickname = client.nickname;
        client.broadcast.emit("messages", nickname + ": " + msg);
        client.emit("messages", nickname + ": " + msg); // send the same message back to our client
        storeMessage(nickname, msg);
    });
    client.on('disconnect', function(name) {
        console.log("user: "+ name +" disconnected");
        client.broadcast.emit("remove chatter", name);
        redisClient.srem("chatters", name);
    });
});





// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
