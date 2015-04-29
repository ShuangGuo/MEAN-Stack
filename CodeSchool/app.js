//var express = require('express');
//var path = require('path');
//var favicon = require('serve-favicon');
//var logger = require('morgan');
//var cookieParser = require('cookie-parser');
//var bodyParser = require('body-parser');
//
//var routes = require('./routes/index');
//var users = require('./routes/users');

var express = require('express');
var app = express();
var http = require('http'); // Using the http module
var request = require('request');
var url = require('url');
var redis = require('redis');
var server = http.createServer(app); // create a new http server and pass the express app as the listener for the server.
var io = require('socket.io')(server); // Using the socket.io module, listen for requests on the http server.
// Store the return object of this operation in a variable called io.
var events = require('events');
var EventEmitter = events.EventEmitter;
var chat = new EventEmitter();

var redisClient = redis.createClient();
var users = [], chatlog = [];

// highfive is a small case to learn about custom modules.
var highfive = require('./high_five.js');
highfive();

// Chat room events
chat.on('message', function(message) {
    chatlog.push(message);
});

chat.on('join', function(nickname) {
    users.push(nickname);
});

chat.emit('join', "hello"); //On the chat object, emit the 'join' event and pass in a custom message as a string.
chat.emit('message', "world"); // Now emit the 'message' event on the chat object. Just like before, remember to pass in a custom message as a string.

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
    // res.send('<h1>Hello World </h1>');
});

var messages = [];


var storeMessage = function(name, data) {
    var message = JSON.stringify({name: name, data: data}); // need to turn object into string to store in redis

    redisClient.lpush("messages", message, function(err, response) {
        redisClient.ltrim("messages", 0, 9); // keeps newest 10 items
    });
    //messages.push({name: name, data: data});
    //if (messages.length > 10) {
    //    messages.shift();
    //}
};

// about socket.io
io.on('connection', function(client) { // Use the object stored in io to listen for client 'connection' events.
    // Remember, the callback function takes one argument, which is the client object that has connected.
    console.log('Client connected...'); // When a new client connects, log a message using console.log().
    // When a question is submitted to our server, we want to broadcast it out to all the connected clients so they can have a chance to answer it.
    // listen for answers here
    client.on('answer', function(question, answer) { // With the client, listen for the 'answer' event from clients
        client.broadcast.emit('answer', question, answer); //Now, emit the 'answer' event on all the other clients connected, passing them the question data.
    });

    client.on('question', function(question) { // In the server, listen for 'question' events from clients.
        // Now, emit the 'question' event on all the other clients connected, passing them the question data.
        if (!client.question_asked) {
            client.question_asked = true; // First, when a client emits a 'question' event, we want to set the value of question_asked to true.
            client.broadcast.emit('question', question); // Second, when a client emits a 'question' event, we want to broadcast that question to the other clients.
        // Finally, when a client emits a 'question' event, check to make sure question_asked is not already set to true. We only want to allow one question per user,
        // so make sure that we only set the value of question_asked and broadcast the question to other clients when the value of question_asked is not already true.
            redisClient.lpush('questions', question);
        }
    });

    // sending data on the socket
    client.on('join', function(name) {
        client.nickname = name;  // set the nickname associated with this client
        //messages.forEach(function(msg) {
        //    msg = JSON.parse(msg); // parse into JSON object
        //    client.emit("messages", msg.name + ": " + msg.data);
        //});

        client.broadcast.emit("add chatter", name); // notify other clients a chatter has joined

        redisClient.lrange("messages", 0, -1, function(err, messages) {
            messages = messages.reverse(); // reverse so they are emitted in correct order
            messages.forEach(function(msg) {
                msg = JSON.parse(msg); // parse into JSON object
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

    client.on('messages', function (msg) { // listen for 'messages' events
        console.log('message: ' + msg);
        var nickname = client.nickname; // get the nickname of this client before broadcasting message
        client.broadcast.emit("messages", nickname + ": " + msg); // broadcast with the name and message
        client.emit("messages", nickname + ": " + msg); // send the same message back to our client
        storeMessage(nickname, msg);
    });

    // remove chatter when they disconnect from server
    client.on('disconnect', function(name) {
        console.log("disconnect...");
        client.broadcast.emit("remove chatter", name);
        redisClient.srem("chatters", name);

    });
});

server.listen(8080, function() {
    console.log('listening on *: 8080');
}); // Finally, we want to tell our http server to listen to requests on port 8080.

// get data from twitter
app.get('/tweets/:username', function(req, response) {
   var username = req.params.username; // from :username

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

// how to show quotes by name
var quotes = {
    'einstein': 'Life is like riding a bicycle. To keep your balance you must keep moving',
    'berners-lee': 'The Web does not just connect machines, it connects people',
    'crockford': 'The good thing about reinventing the wheel is that you can get a round one',
    'hofstadter': 'Which statement seems more true: (1) I have a brain. (2) I am a brain.'
};
// http://localhost:8080/quotes/einstein
app.get('/quotes/:name', function(req, res) { //Start by creating a GET route for '/quotes' that takes a name parameter as part of the URL path.
    var name = req.params.name; //Now, use the name parameter from the URL to retrieve a quote from the quotes object and write it out to the response.
    var quote = quotes[name];
    //res.end(quotes[name]);
    res.render("quotes.ejs", {
        name: name,
        quote: quote
    });
});




//// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
//
//// uncomment after placing your favicon in /public
////app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
//app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));
//
////app.use('/', routes);
//app.use('/users', users);
//
//// catch 404 and forward to error handler
//app.use(function(req, res, next) {
//  var err = new Error('Not Found');
//  err.status = 404;
//  next(err);
//});
//
//// error handlers
//
//// development error handler
//// will print stacktrace
//if (app.get('env') === 'development') {
//  app.use(function(err, req, res, next) {
//    res.status(err.status || 500);
//    res.render('error', {
//      message: err.message,
//      error: err
//    });
//  });
//}
//
//// production error handler
//// no stacktraces leaked to user
//app.use(function(err, req, res, next) {
//  res.status(err.status || 500);
//  res.render('error', {
//    message: err.message,
//    error: {}
//  });
//});


module.exports = app;
