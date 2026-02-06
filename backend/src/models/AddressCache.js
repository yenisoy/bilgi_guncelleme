const mongoose = require('mongoose');

// Schema for cached address data from Google Maps
const addressCacheSchema = new mongoose.Schema({
    // Type: 'province', 'district', 'neighborhood', 'street'
    type: {
        type: String,
        required: true,
        enum: ['province', 'district', 'neighborhood', 'street']
    },

    // Parent reference (e.g., district belongs to province)
    parentId: {
        type: String,
        default: null
    },

    // Place ID from Google Maps
    placeId: {
        type: String,
        required: true,
        unique: true
    },

    // Display name
    name: {
        type: String,
        required: true
    },

    // Full formatted address from Google
    formattedAddress: {
        type: String
    },

    // Location coordinates
    location: {
        lat: Number,
        lng: Number
    },

    // For provinces - store children fetched status
    childrenFetched: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for faster queries
addressCacheSchema.index({ type: 1, parentId: 1 });
addressCacheSchema.index({ type: 1, name: 1 });

module.exports = mongoose.model('AddressCache', addressCacheSchema);
