require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const AddressCacheSchema = new mongoose.Schema({
    type: String, // 'province', 'district', 'neighborhood', 'street'
    parentId: String,
    placeId: String,
    name: String,
    formattedAddress: String
}); // Default collection: addresscaches

const AddressCache = mongoose.model('AddressCache', AddressCacheSchema);

async function addMissing() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/adres-dogrulama');
        console.log('Connected to DB');

        const provinceName = 'Antalya';
        const districtName = 'Elmalı';
        const neighborhoodName = 'YeniBirMahalle';

        // 1. Find Province
        const province = await AddressCache.findOne({ type: 'province', name: provinceName });
        if (!province) { console.log('Province not found'); return; }

        // 2. Find District
        const district = await AddressCache.findOne({ type: 'district', parentId: province.placeId, name: districtName });
        if (!district) { console.log('District not found'); return; }

        // 3. Check if exists
        const exists = await AddressCache.findOne({ type: 'neighborhood', parentId: district.placeId, name: neighborhoodName });
        if (exists) {
            console.log('Neighborhood already exists.');
            return;
        }

        // 4. Add
        const placeId = `neighborhood_custom_${Date.now()}`;
        await AddressCache.create({
            type: 'neighborhood',
            parentId: district.placeId,
            placeId: placeId,
            name: neighborhoodName,
            formattedAddress: `${neighborhoodName}, ${districtName}, ${provinceName}`
        });

        console.log(`Successfully added missing neighborhood: ${neighborhoodName}`);

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

addMissing();
