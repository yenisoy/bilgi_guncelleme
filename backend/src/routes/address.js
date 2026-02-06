const express = require('express');
const turkiyeApi = require('../utils/turkiyeApi');

const router = express.Router();

// Get all provinces
router.get('/provinces', async (req, res) => {
    try {
        const provinces = await turkiyeApi.getProvinces();
        res.json(provinces);
    } catch (error) {
        console.error('Provinces error:', error);
        res.status(500).json({ error: 'İller alınırken hata oluştu' });
    }
});

// Get districts by province
router.get('/districts/:provinceId', async (req, res) => {
    try {
        const districts = await turkiyeApi.getDistricts(req.params.provinceId);
        res.json(districts);
    } catch (error) {
        console.error('Districts error:', error);
        res.status(500).json({ error: 'İlçeler alınırken hata oluştu' });
    }
});

// Get neighborhoods by district
router.get('/neighborhoods/:provinceId/:districtId', async (req, res) => {
    try {
        const neighborhoods = await turkiyeApi.getNeighborhoods(
            req.params.provinceId,
            req.params.districtId
        );
        res.json(neighborhoods);
    } catch (error) {
        console.error('Neighborhoods error:', error);
        res.status(500).json({ error: 'Mahalleler alınırken hata oluştu' });
    }
});

// Sync all data
router.post('/sync', async (req, res) => {
    // Process in background to avoid accumulation of waiting requests
    turkiyeApi.syncAllData().catch(err => console.error('Background sync failed:', err));

    res.json({
        message: 'Senkronizasyon işlemi arka planda başlatıldı. Bu işlem 5-10 dakika sürebilir. Konsol loglarını kontrol edebilirsiniz.'
    });
});

module.exports = router;
