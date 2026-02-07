const express = require('express');
const { Person, AddressChange } = require('../models');
const { generateUniqueCode } = require('../utils/codeGenerator');

const router = express.Router();

// Track button click (must be before /:uniqueCode to avoid matching)
router.post('/track-click/:uniqueCode', async (req, res) => {
    try {
        const { uniqueCode } = req.params;
        const person = await Person.findOne({ uniqueCode: uniqueCode.toUpperCase() });

        if (!person) {
            return res.status(404).json({ error: 'Kişi bulunamadı' });
        }

        person.buttonClicks.push(new Date());
        await person.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Track click error:', error);
        res.status(500).json({ error: 'Takip kaydı sırasında hata oluştu' });
    }
});

// Get person by unique code (public access) + track visit
router.get('/:uniqueCode', async (req, res) => {
    try {
        const { uniqueCode } = req.params;

        const person = await Person.findOne({ uniqueCode: uniqueCode.toUpperCase() });

        if (!person) {
            // Return empty structure for new entry
            return res.json({
                exists: false,
                data: null
            });
        }

        // Track link visit
        person.linkVisits.push(new Date());
        await person.save();

        // Check for pending changes
        const pendingChange = await AddressChange.findOne({
            uniqueCode: uniqueCode.toUpperCase(),
            status: 'pending'
        }).sort({ createdAt: -1 });

        let displayData = {
            firstName: person.firstName,
            lastName: person.lastName,
            phone: person.phone,
            email: person.email,
            province: person.province,
            district: person.district,
            neighborhood: person.neighborhood,
            street: person.street,
            buildingNo: person.buildingNo,
            apartmentNo: person.apartmentNo,
            postalCode: person.postalCode,
            fullAddress: person.fullAddress
        };

        // If there is a pending change, show that data instead
        if (pendingChange && pendingChange.newData) {
            console.log('--- SHOWING PENDING DATA ---', pendingChange.newData); // DEBUG
            displayData = { ...displayData, ...pendingChange.newData };
        }

        res.json({
            exists: true,
            data: displayData
        });
    } catch (error) {
        console.error('Get person by code error:', error);
        res.status(500).json({ error: 'Kişi bilgileri alınırken hata oluştu' });
    }
});

// Submit address update/new entry (public access)
router.post('/submit', async (req, res) => {
    try {
        const { uniqueCode, data } = req.body;

        if (!data || !data.firstName || !data.lastName) {
            return res.status(400).json({ error: 'İsim ve soyisim alanları zorunludur' });
        }

        // Check if person exists
        const existingPerson = uniqueCode
            ? await Person.findOne({ uniqueCode: uniqueCode.toUpperCase() })
            : null;

        if (existingPerson) {
            // Track form submission
            existingPerson.formSubmissions.push(new Date());
            await existingPerson.save();

            // Check for existing pending request
            const existingPending = await AddressChange.findOne({
                uniqueCode: existingPerson.uniqueCode,
                status: 'pending'
            });

            if (existingPending) {
                // Update existing pending request
                existingPending.newData = data;
                await existingPending.save();

                res.json({
                    message: 'Adres güncelleme isteğiniz güncellendi.',
                    type: 'update'
                });
            } else {
                // Create new address change request
                const oldData = {
                    firstName: existingPerson.firstName,
                    lastName: existingPerson.lastName,
                    phone: existingPerson.phone,
                    email: existingPerson.email,
                    province: existingPerson.province,
                    district: existingPerson.district,
                    neighborhood: existingPerson.neighborhood,
                    street: existingPerson.street,
                    buildingNo: existingPerson.buildingNo,
                    apartmentNo: existingPerson.apartmentNo,
                    postalCode: existingPerson.postalCode,
                    fullAddress: existingPerson.fullAddress
                };

                await AddressChange.create({
                    personId: existingPerson._id,
                    uniqueCode: existingPerson.uniqueCode,
                    oldData,
                    newData: data,
                    status: 'pending',
                    isNewEntry: false
                });

                res.json({
                    message: 'Adres güncelleme isteğiniz alındı. Onay sonrası güncellenecektir.',
                    type: 'update'
                });
            }
        } else {
            // New entry without existing person
            const newUniqueCode = uniqueCode?.toUpperCase() || generateUniqueCode();

            await AddressChange.create({
                uniqueCode: newUniqueCode,
                oldData: null,
                newData: data,
                status: 'pending',
                isNewEntry: true
            });

            res.json({
                message: 'Kayıt talebiniz alındı. Onay sonrası sisteme eklenecektir.',
                type: 'new',
                uniqueCode: newUniqueCode
            });
        }
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Gönderim sırasında hata oluştu' });
    }
});

module.exports = router;
