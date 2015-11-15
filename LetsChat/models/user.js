var mongoose = require('mongoose');

var User = new mongoose.Schema ({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    activated: { type: Boolean, default: false },
    createDate: { type: Date, default: Date.now },
    updatedDate: { type: Date, default: Date.now },
    role: { type: Number, default: 10 }, // common user: 10, admin: 1
    userName:{ type: String }
});

User.index({ email: 1}, { uniqueName: 1});

// Define and Export Models
module.exports = mongoose.model('User', User);