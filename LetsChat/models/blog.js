var mongoose = require('mongoose');

var Blog = new mongoose.Schema ({
    author_id: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type:{ type: Number, default: 0 },
    files: { type: Object },
    createDate: { type: Date, default: Date.now },
    updatedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Blog', Blog);