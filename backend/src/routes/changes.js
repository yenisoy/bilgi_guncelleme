const express = require('express');
const { AddressChange, Person } = require('../models');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get pending count - public route (for navbar badge)
router.get('/pending-count', async (req, res) => {
    try {
        const count = await AddressChange.countDocuments({ status: 'pending' });
        res.json({ count });
    } catch (error) {
        console.error('Pending count error:', error);
        res.status(500).json({ error: 'Sayı alınırken hata oluştu' });
    }
});

// All other routes require authentication
router.use(authMiddleware);

// Get all pending changes
router.get('/', async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const query = status === 'all' ? {} : { status };

        const [changes, total] = await Promise.all([
            AddressChange.find(query)
                .populate('personId', 'firstName lastName uniqueCode')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            AddressChange.countDocuments(query)
        ]);

        res.json({
            changes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get changes error:', error);
        res.status(500).json({ error: 'Değişiklikler alınırken hata oluştu' });
    }
});

// Approve change
router.post('/:id/approve', async (req, res) => {
    try {
        const { addToSystem } = req.body;
        const change = await AddressChange.findById(req.params.id);

        if (!change) {
            return res.status(404).json({ error: 'Değişiklik bulunamadı' });
        }

        if (change.status !== 'pending') {
            return res.status(400).json({ error: 'Bu değişiklik zaten işlenmiş' });
        }

        // Flatten data if address is nested
        let flatData = { ...change.newData };
        if (flatData.address) {
            flatData = { ...flatData, ...flatData.address };
            delete flatData.address;
        }

        if (change.isNewEntry) {
            // Create new person
            await Person.create({
                uniqueCode: change.uniqueCode,
                ...flatData
            });
        } else {
            // Update existing person
            await Person.findByIdAndUpdate(change.personId, flatData);
        }

        // Add to system if requested (for manual neighborhoods)
        if (addToSystem && change.newData.isManualNeighborhood) {
            const { province, district, neighborhood } = change.newData;
            console.log(`Adding custom neighborhood to system: ${neighborhood}`);

            // Require inside function to handle circular dependency if any
            const turkiyeApi = require('../utils/turkiyeApi');
            await turkiyeApi.addCustomNeighborhood(province, district, neighborhood);
        }

        change.status = 'approved';
        await change.save();

        res.json({ message: 'Değişiklik onaylandı', change });
    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ error: 'Onaylama sırasında hata oluştu' });
    }
});

// Reject change
router.post('/:id/reject', async (req, res) => {
    try {
        const change = await AddressChange.findById(req.params.id);

        if (!change) {
            return res.status(404).json({ error: 'Değişiklik bulunamadı' });
        }

        if (change.status !== 'pending') {
            return res.status(400).json({ error: 'Bu değişiklik zaten işlenmiş' });
        }

        change.status = 'rejected';
        await change.save();

        res.json({ message: 'Değişiklik reddedildi', change });
    } catch (error) {
        console.error('Reject error:', error);
        res.status(500).json({ error: 'Reddetme sırasında hata oluştu' });
    }
});

module.exports = router;
