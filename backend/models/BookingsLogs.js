const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SlotSchema = new Schema({
    href: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['listed', 'booked', 'error'],
        default: 'listed'
    },
    locationId: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    shortDate: String,
    isoDate: String
});

const BookingsLogsSchema = new Schema({
    clinicianId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    // Add new fields for cleaned names
    cleanName: {
        type: String,
        default: ''
    },
    searchableName: {
        type: String,
        default: ''
    },
    slots: [SlotSchema]
}, {
    timestamps: true
});

// Create indexes
BookingsLogsSchema.index({ clinicianId: 1 });
BookingsLogsSchema.index({ "slots.href": 1 });
BookingsLogsSchema.index({ searchableName: 1 }); // Add index for searchableName

module.exports = mongoose.model("BookingsLogs", BookingsLogsSchema);