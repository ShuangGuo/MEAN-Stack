var config = {};

config.mongodb = {
  url: "localhost:27017",
  dbName: "letschat"
};
config.mongodbURL = 'mongodb://' + config.mongodb.url + '/' + config.mongodb.dbName;

module.exports = config;