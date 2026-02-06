const express = require('express');
const AddressCache = require('../models/AddressCache');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Get list of addresses with filtering
router.get('/list', async (req, res) => {
    try {
        const { type, parentId, search } = req.query;
        const query = { type };

        if (parentId) {
            query.parentId = parentId;
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Sort by name
        let items = await AddressCache.find(query).sort({ name: 1 }).collation({ locale: 'tr' }).lean();

        // Collect Parent IDs
        const parentIds = [...new Set(items.map(i => i.parentId).filter(id => id))];
        let parents = [];
        if (parentIds.length > 0) {
            parents = await AddressCache.find({ placeId: { $in: parentIds } }).lean();
        }

        const parentMap = {};
        parents.forEach(p => parentMap[p.placeId] = p);

        // Collect Grandparent IDs (for neighborhoods)
        let grandParents = [];
        if (type === 'neighborhood') {
            const grandParentIds = [...new Set(parents.map(p => p.parentId).filter(id => id))];
            if (grandParentIds.length > 0) {
                grandParents = await AddressCache.find({ placeId: { $in: grandParentIds } }).lean();
                grandParents.forEach(gp => parentMap[gp.placeId] = gp);
            }
        }

        const results = items.map(item => {
            let provinceName = null;
            let districtName = null;
            const parent = parentMap[item.parentId];

            if (type === 'district') {
                provinceName = parent ? parent.name : '-';
            } else if (type === 'neighborhood') {
                districtName = parent ? parent.name : '-';
                const grandParent = parent ? parentMap[parent.parentId] : null;
                provinceName = grandParent ? grandParent.name : '-';
            }

            return {
                id: item._id,
                placeId: item.placeId,
                name: item.name,
                parentId: item.parentId,
                isManual: item.placeId.includes('_custom_'),
                provinceName,
                districtName
            };
        });

        res.json(results);
    } catch (error) {
        console.error('List error:', error);
        res.status(500).json({ error: 'Listeleme hatası' });
    }
});

// Add new address entry
router.post('/add', async (req, res) => {
    try {
        const { type, parentId, name } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'İsim ve tür zorunludur' });
        }

        // Generate custom Place ID
        const placeId = `${type}_custom_${Date.now()}`;

        // Construct formatted address if possible
        let formattedAddress = name;
        if (parentId) {
            const parent = await AddressCache.findOne({ placeId: parentId });
            if (parent) {
                formattedAddress = `${name}, ${parent.name}`; // Simplified
            }
        }

        const newEntry = await AddressCache.create({
            type,
            parentId: parentId || null,
            placeId,
            name,
            formattedAddress
        });

        res.json({ message: 'Kayıt eklendi', data: newEntry });
    } catch (error) {
        console.error('Add error:', error);
        res.status(500).json({ error: 'Ekleme sırasında hata oluştu' });
    }
});

// Delete address entry
router.delete('/:id', async (req, res) => {
    try {
        const item = await AddressCache.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Kayıt bulunamadı' });
        }

        // Check for children
        const childCount = await AddressCache.countDocuments({ parentId: item.placeId });
        if (childCount > 0) {
            return res.status(400).json({
                error: `Bu kaydın ${childCount} alt kaydı var. Önce onları silmelisiniz.`
            });
        }

        await AddressCache.findByIdAndDelete(req.params.id);
        res.json({ message: 'Kayıt silindi' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Silme sırasında hata oluştu' });
    }
});

module.exports = router;
