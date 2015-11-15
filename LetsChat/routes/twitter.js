var express = require('express');
var router = express.Router();

/* get data from twitter LV5*/
var getTweetsByName = function(req, response) {
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
};

/* how to show quotes by name */
var quotes = {
    'einstein': 'Life is like riding a bicycle. To keep your balance you must keep moving',
    'berners-lee': 'The Web does not just connect machines, it connects people',
    'crockford': 'The good thing about reinventing the wheel is that you can get a round one',
    'hofstadter': 'Which statement seems more true: (1) I have a brain. (2) I am a brain.'
};
var getQuotesByName = function(req, res) {
    var name = req.params.name;
    var quote = quotes[name];
    res.render("quotes.ejs", {
        name: name,
        quote: quote
    });
};

router.get('/quotes/:name', getQuotesByName);
router.get('/tweets/:username', getTweetsByName);

module.exports = router;