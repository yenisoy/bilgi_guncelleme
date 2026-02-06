const fs = require('fs');
const path = require('path');
const AddressCache = require('../models/AddressCache');

const DATA_FILE = path.join(__dirname, '../data/full-turkey-addresses.json');

async function seedAddresses() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            console.log('Address seed file not found. Skipping auto-seed.');
            return;
        }

        const count = await AddressCache.countDocuments();
        if (count > 1000) {
            console.log(`Address cache already has ${count} records. Skipping seed.`);
            return;
        }

        console.log('Starting address database seeding...');
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(rawData);

        const operations = [];

        // Prepare operations
        for (const province of data.provinces) {
            // Province
            const pId = `province_${province.id}`;
            operations.push({
                updateOne: {
                    filter: { placeId: pId },
                    update: {
                        $set: {
                            type: 'province',
                            placeId: pId,
                            name: province.name,
                            formattedAddress: province.name
                        }
                    },
                    upsert: true
                }
            });

            // Districts
            if (province.districts) {
                for (const district of province.districts) {
                    const dId = `district_${district.id}`;
                    operations.push({
                        updateOne: {
                            filter: { placeId: dId },
                            update: {
                                $set: {
                                    type: 'district',
                                    parentId: pId,
                                    placeId: dId, // "placeId" field is required by schema if unique
                                    name: district.name
                                }
                            },
                            upsert: true
                        }
                    });

                    // Neighborhoods
                    if (district.neighborhoods) {
                        for (const neighborhood of district.neighborhoods) {
                            const nId = `neighborhood_${neighborhood.id}`;
                            const nName = neighborhood.name.includes('Mahallesi') || neighborhood.name.includes('Mah.') || neighborhood.name.includes('Köyü')
                                ? neighborhood.name
                                : `${neighborhood.name} Mahallesi`;

                            operations.push({
                                updateOne: {
                                    filter: { placeId: nId },
                                    update: {
                                        $set: {
                                            type: 'neighborhood',
                                            parentId: dId,
                                            placeId: nId,
                                            name: nName
                                        }
                                    },
                                    upsert: true
                                }
                            });
                        }
                    }
                }
            }
        }

        if (operations.length > 0) {
            console.log(`Prepared ${operations.length} operations. Executing bulk write...`);
            // Bulk write in chunks of 1000 to avoid limits
            const CHUNK_SIZE = 1000;
            for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
                const chunk = operations.slice(i, i + CHUNK_SIZE);
                await AddressCache.bulkWrite(chunk);
                process.stdout.write(`Processed ${Math.min(i + CHUNK_SIZE, operations.length)} / ${operations.length}\r`);
            }
            console.log('\nAddress seeding completed successfully!');
        }

    } catch (error) {
        console.error('Error seeding addresses:', error);
    }
}

module.exports = seedAddresses;
