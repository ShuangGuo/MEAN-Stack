/**
 * Created by guest on 4/21/15.
 */
var events = require('events');
var EventEmitter = events.EventEmitter;
var chat = new EventEmitter(); // Create a new EventEmitter object and assign it to a variable called 'chat'.
//Next, let's listen for the 'message' event on our new chat object. Remember to add a callback that accepts the message parameter.
chat.on('message', function(message) {
    console.log(message);// Log the message to the console using console.log().
});

