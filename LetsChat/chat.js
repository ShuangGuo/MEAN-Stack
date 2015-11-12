var EventEmitter = require('events').EventEmitter;
var chat = new EventEmitter();
var users = [], chatlog = [];
/* Chat room events */
chat.on('message', function(message) {
    chatlog.push(message);
    console.log(message);
});
chat.on('join', function(nickname) {
    users.push(nickname);
    console.log(nickname);
});
chat.emit('join', "hello"); //On the chat object, emit the 'join' event and pass in a custom message as a string.
chat.emit('message', "world");