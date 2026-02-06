const fs = require('fs');
const path = require('path');

// API Configuration
const API_BASE = 'https://turkiyeapi.dev/api/v1';
const OUTPUT_FILE = path.join(__dirname, '../src/data/full-turkey-addresses.json');

// Helper for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for fetching
async function fetchAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        const data = await response.json();
        return data.status === 'OK' || data.data ? (data.data || data) : null;
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('Starting full address fetch...');
    console.log('This may take several minutes. Please wait...');

    const fullData = {
        provinces: []
    };

    // 1. Fetch Provinces
    console.log('Fetching provinces...');
    const provinces = await fetchAPI('/provinces');

    if (!provinces) {
        console.error('Failed to fetch provinces');
        return;
    }

    console.log(`Found ${provinces.length} provinces. Processing...`);

    // Process each province
    for (const [pIndex, province] of provinces.entries()) {
        const provinceData = {
            id: province.id,
            name: province.name,
            population: province.population,
            area: province.area,
            districts: []
        };

        console.log(`[${pIndex + 1}/${provinces.length}] Processing ${province.name}...`);

        // 2. Fetch Districts for this province
        const pDetail = await fetchAPI(`/provinces/${province.id}`);
        if (pDetail && pDetail.districts) {

            // Process each district
            for (const [dIndex, district] of pDetail.districts.entries()) {
                // await delay(100); // Small delay to be nice to the API

                const districtData = {
                    id: district.id,
                    name: district.name,
                    neighborhoods: []
                };

                // 3. Fetch Neighborhoods for this district
                // console.log(`  - Fetching neighborhoods for ${district.name}...`);
                const dDetail = await fetchAPI(`/districts/${district.id}`);

                if (dDetail && dDetail.neighborhoods) {
                    districtData.neighborhoods = dDetail.neighborhoods.map(n => ({
                        id: n.id,
                        name: n.name
                    }));
                }

                // Add villages as neighborhoods if present
                if (dDetail && dDetail.villages) {
                    dDetail.villages.forEach(v => {
                        districtData.neighborhoods.push({
                            id: v.id,
                            name: `${v.name} Köyü`
                        });
                    });
                }

                provinceData.districts.push(districtData);
                process.stdout.write('.'); // Progress indicator
            }
        }
        console.log('\n'); // New line

        fullData.provinces.push(provinceData);
    }

    // Save to file
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fullData, null, 2));

    console.log(`\nAddress data saved to: ${OUTPUT_FILE}`);
    console.log(`Total Provinces: ${fullData.provinces.length}`);
}

main().catch(console.error);
