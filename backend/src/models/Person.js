const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
    uniqueCode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    province: {
        type: String,
        trim: true
    },
    district: {
        type: String,
        trim: true
    },
    neighborhood: {
        type: String,
        trim: true
    },
    street: {
        type: String,
        trim: true
    },
    buildingNo: {
        type: String,
        trim: true
    },
    apartmentNo: {
        type: String,
        trim: true
    },
    postalCode: {
        type: String,
        trim: true
    },
    fullAddress: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Person', personSchema);
