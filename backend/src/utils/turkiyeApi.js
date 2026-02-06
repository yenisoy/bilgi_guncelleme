const AddressCache = require('../models/AddressCache');

// Türkiye API - Free Turkish Address API  
const TURKIYE_API_BASE = 'https://turkiyeapi.dev/api/v1';

/**
 * Fetch from Türkiye API
 */
async function fetchTurkiyeAPI(endpoint) {
    try {
        const response = await fetch(`${TURKIYE_API_BASE}${endpoint}`);
        const data = await response.json();

        if (data.status === 'OK' || data.data) {
            return data.data || data;
        }
        return null;
    } catch (error) {
        console.error('Türkiye API error:', error);
        return null;
    }
}

/**
 * Get all provinces
 */
async function getProvinces() {
    const cached = await AddressCache.find({ type: 'province' }).sort({ name: 1 }).collation({ locale: 'tr' });

    if (cached.length >= 81) {
        return cached.map(p => ({ id: p.placeId, name: p.name }));
    }

    console.log('Fetching provinces from Türkiye API...');
    const provinces = await fetchTurkiyeAPI('/provinces');

    if (!provinces || !Array.isArray(provinces)) {
        console.error('Failed to fetch provinces');
        return [];
    }

    const result = [];
    for (const province of provinces) {
        const placeId = `province_${province.id}`;

        await AddressCache.findOneAndUpdate(
            { placeId },
            { type: 'province', placeId, name: province.name, formattedAddress: province.name },
            { upsert: true, new: true }
        );

        result.push({ id: placeId, name: province.name });
    }

    console.log(`Cached ${result.length} provinces`);
    return result.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

/**
 * Get districts for a province
 */
async function getDistricts(provinceId) {
    const numericId = provinceId.replace('province_', '');

    const cached = await AddressCache.find({ type: 'district', parentId: provinceId }).sort({ name: 1 }).collation({ locale: 'tr' });

    if (cached.length > 0) {
        return cached.map(d => ({ id: d.placeId, name: d.name }));
    }

    console.log(`Fetching districts for province ${numericId}...`);
    const provinceData = await fetchTurkiyeAPI(`/provinces/${numericId}`);

    if (!provinceData || !provinceData.districts) {
        console.error('Failed to fetch districts');
        return [];
    }

    const result = [];
    for (const district of provinceData.districts) {
        const placeId = `district_${district.id}`;

        await AddressCache.findOneAndUpdate(
            { placeId },
            { type: 'district', parentId: provinceId, placeId, name: district.name },
            { upsert: true, new: true }
        );

        result.push({ id: placeId, name: district.name });
    }

    console.log(`Cached ${result.length} districts`);
    return result.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

/**
 * Get neighborhoods for a district
 */
async function getNeighborhoods(provinceId, districtId) {
    const numericId = districtId.replace('district_', '');

    const cached = await AddressCache.find({ type: 'neighborhood', parentId: districtId }).sort({ name: 1 }).collation({ locale: 'tr' });

    if (cached.length > 0) {
        return cached.map(n => ({ id: n.placeId, name: n.name }));
    }

    console.log(`Fetching neighborhoods for district ${numericId}...`);
    const districtData = await fetchTurkiyeAPI(`/districts/${numericId}`);

    if (!districtData || !districtData.neighborhoods) {
        console.error('Failed to fetch neighborhoods');
        const placeId = `neighborhood_${districtId}_diger`;
        await AddressCache.findOneAndUpdate(
            { placeId },
            { type: 'neighborhood', parentId: districtId, placeId, name: 'Diğer' },
            { upsert: true, new: true }
        );
        return [{ id: placeId, name: 'Diğer' }];
    }

    const result = [];
    for (const neighborhood of districtData.neighborhoods) {
        const placeId = `neighborhood_${neighborhood.id}`;
        const name = neighborhood.name.includes('Mahallesi') || neighborhood.name.includes('Mah.')
            ? neighborhood.name
            : `${neighborhood.name} Mahallesi`;

        await AddressCache.findOneAndUpdate(
            { placeId },
            { type: 'neighborhood', parentId: districtId, placeId, name },
            { upsert: true, new: true }
        );

        result.push({ id: placeId, name });
    }

    // Add villages
    if (districtData.villages && districtData.villages.length > 0) {
        for (const village of districtData.villages) {
            const placeId = `neighborhood_${village.id}`;
            await AddressCache.findOneAndUpdate(
                { placeId },
                { type: 'neighborhood', parentId: districtId, placeId, name: `${village.name} Köyü` },
                { upsert: true, new: true }
            );
            result.push({ id: placeId, name: `${village.name} Köyü` });
        }
    }

    console.log(`Cached ${result.length} neighborhoods`);
    return result.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sync all data from API to DB (Provinces -> Districts -> Neighborhoods)
 * This is a heavy operation!
 */
async function syncAllData() {
    console.log('Starting full address synchronization...');
    let totalDistricts = 0;
    let totalNeighborhoods = 0;

    // 1. Get Provinces
    const provinces = await getProvinces();
    console.log(`Found ${provinces.length} provinces. Processing details...`);

    for (const province of provinces) {
        console.log(`Processing province: ${province.name}`);

        // 2. Get Districts
        const districts = await getDistricts(province.id);
        totalDistricts += districts.length;

        for (const district of districts) {
            // Small delay to prevent rate limiting
            // await delay(50); 

            // 3. Get Neighborhoods (this triggers API fetch if not in DB)
            const neighborhoods = await getNeighborhoods(province.id, district.id);
            totalNeighborhoods += neighborhoods.length;

            process.stdout.write('.');
        }
        console.log(`\nCompleted ${province.name}: ${districts.length} districts processed.`);
    }

    console.log(`\nSync completed! Total: ${provinces.length} provinces, ${totalDistricts} districts, ${totalNeighborhoods} neighborhoods.`);
    return {
        provinces: provinces.length,
        districts: totalDistricts,
        neighborhoods: totalNeighborhoods
    };
}

/**
 * Add custom neighborhood to cache
 */
async function addCustomNeighborhood(provinceName, districtName, neighborhoodName) {
    try {
        // 1. Find Province ID
        const province = await AddressCache.findOne({
            type: 'province',
            name: { $regex: new RegExp(`^${provinceName}$`, 'i') }
        });

        if (!province) {
            console.error(`Province not found: ${provinceName}`);
            return false;
        }

        // 2. Find District ID
        const district = await AddressCache.findOne({
            type: 'district',
            parentId: province.placeId,
            name: { $regex: new RegExp(`^${districtName}$`, 'i') }
        });

        if (!district) {
            console.error(`District not found: ${districtName} in ${provinceName}`);
            return false;
        }

        // 3. Add Custom Neighborhood
        const placeId = `neighborhood_custom_${Date.now()}`;
        await AddressCache.create({
            type: 'neighborhood',
            parentId: district.placeId,
            placeId: placeId,
            name: neighborhoodName,
            formattedAddress: `${neighborhoodName}, ${district.name}, ${province.name}`
        });

        console.log(`Added custom neighborhood: ${neighborhoodName}`);
        return true;

    } catch (error) {
        console.error('Error adding custom neighborhood:', error);
        return false;
    }
}

module.exports = {
    getProvinces,
    getDistricts,
    getNeighborhoods,
    syncAllData,
    addCustomNeighborhood
};
