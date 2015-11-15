var mongoose = require('mongoose');

var Event = new mongoose.Schema ({
    host_id: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    address: {
        street1: { type: String },
        street2: { type: String },
        city: { type: String },
        state: { type: String },
        zip: { type: String },
        country: { type: String}
    },
    phone: { type: String},
    email: { type: String},
    type:{ type: Number, default: 0 },
    startDateTime: { type: Date },
    endDateTime: { type: Date },
    files: { type: Object },
    joined_users:[],
    saved_users:[],
    invited_users:[],
    tickets: { type: Object },
    createDate: { type: Date, default: Date.now },
    updatedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', Event);
