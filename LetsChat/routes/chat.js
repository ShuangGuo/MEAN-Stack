var express = require('express');
var app = require('../app');
var User = require('../models/user');
var router = express.Router();

var chatting = function (callback) {
    
};

router.get('/chatting', chatting);

module.exports = router;