const mongoose = require('mongoose');

const addressChangeSchema = new mongoose.Schema({
    personId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Person',
        required: false
    },
    uniqueCode: {
        type: String,
        required: true
    },
    oldData: {
        type: Object,
        default: null
    },
    newData: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    isNewEntry: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AddressChange', addressChangeSchema);
