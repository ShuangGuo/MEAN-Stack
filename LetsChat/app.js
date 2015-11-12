var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var request = require('request');
var url = require('url');
var routes = require('./routes/index');

var server = require('http').createServer(app);
var io = require('socket.io')(server);

var redis = require('redis');
var redisClient = redis.createClient();

var highfive = require('./public/high_five.js'); // Custom Modules
highfive();

/* socket.io */
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
        console.log('messages: ' + msg);
        var nickname = client.nickname;
        client.broadcast.emit("messages", nickname + ": " + msg);
        client.emit("messages", nickname + ": " + msg); // send the same message back to our client
        storeMessage(nickname, msg);
    });
    client.on('disconnect', function(name) {
        console.log("disconnect...");
        client.broadcast.emit("remove chatter", name);
        redisClient.srem("chatters", name);
    });
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
}); //app.use(express.static('public'));


server.listen(8080, function() {
    console.log('listening on *: 8080');
});

/* get data from twitter LV5*/
app.get('/tweets/:username', function(req, response) {
   var username = req.params.username;
    options = {
        protocol: "https:",
        host: 'api.twitter.com',
        pathname: '/1.1/statuses/user_timeline.json',
        query: {screen_name: username, count: 10} // get the last 10 tweets for screen_name
    };
    var twitterUrl = url.format(options);
    console.log(twitterUrl);
    request(twitterUrl).pipe(response); //In our new route, issue a request to twitterUrl and pipe the results into the response.
    request(twitterUrl, function(err, res, body) {
        var tweets = JSON.parse(body);
        response.locals = {tweets: tweets, name: username};
        response.render('tweets.ejs');
    });
});

/* how to show quotes by name */
var quotes = {
    'einstein': 'Life is like riding a bicycle. To keep your balance you must keep moving',
    'berners-lee': 'The Web does not just connect machines, it connects people',
    'crockford': 'The good thing about reinventing the wheel is that you can get a round one',
    'hofstadter': 'Which statement seems more true: (1) I have a brain. (2) I am a brain.'
};
app.get('/quotes/:name', function(req, res) { // http://localhost:8080/quotes/einstein
    var name = req.params.name;
    var quote = quotes[name];
    res.render("quotes.ejs", {
        name: name,
        quote: quote
    });
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//app.use('/', routes);
//app.use('/users', users);

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
