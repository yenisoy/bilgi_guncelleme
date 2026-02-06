require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { ConnectOptions } = require('mongoose');

// Define minimal schema to query AddressCache
const AddressCacheSchema = new mongoose.Schema({
    type: String,
    parentId: String,
    placeId: String,
    name: String
}); // Default collection: addresscaches

const AddressCache = mongoose.model('AddressCache', AddressCacheSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/adres-dogrulama');
        console.log('Connected to DB');

        // 1. Find District "Elmalı" in "Antalya"
        // First find Antalya
        const province = await AddressCache.findOne({ type: 'province', name: 'Antalya' });
        if (!province) {
            console.log('Province Antalya not found');
            return;
        }

        const district = await AddressCache.findOne({
            type: 'district',
            parentId: province.placeId,
            name: 'Elmalı'
        });

        if (!district) {
            console.log('District Elmalı not found');
            return;
        }

        console.log(`Checking neighborhoods for District: ${district.name} (${district.placeId})`);

        const neighborhoods = await AddressCache.find({
            type: 'neighborhood',
            parentId: district.placeId
        });

        console.log(`Found ${neighborhoods.length} neighborhoods.`);

        const custom = neighborhoods.find(n => n.name === 'YeniBirMahalle');
        if (custom) {
            console.log('SUCCESS: Custom neighborhood "YeniBirMahalle" found!');
            console.log(custom);
        } else {
            console.log('FAILURE: Custom neighborhood "YeniBirMahalle" NOT found.');
            // List all to see
            console.log('Listing all:', neighborhoods.map(n => n.name));
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

check();
