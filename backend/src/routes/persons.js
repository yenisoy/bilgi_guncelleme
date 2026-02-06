const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { Person } = require('../models');
const authMiddleware = require('../middleware/auth');
const { generateUniqueCode } = require('../utils/codeGenerator');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authMiddleware);

// Get all persons
router.get('/', async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            query = {
                $or: [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } },
                    { uniqueCode: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const [persons, total] = await Promise.all([
            Person.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Person.countDocuments(query)
        ]);

        res.json({
            persons,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get persons error:', error);
        res.status(500).json({ error: 'Kişiler alınırken hata oluştu' });
    }
});

// Get single person
router.get('/:id', async (req, res) => {
    try {
        const person = await Person.findById(req.params.id);
        if (!person) {
            return res.status(404).json({ error: 'Kişi bulunamadı' });
        }
        res.json(person);
    } catch (error) {
        console.error('Get person error:', error);
        res.status(500).json({ error: 'Kişi alınırken hata oluştu' });
    }
});

// Create person
router.post('/', async (req, res) => {
    try {
        const uniqueCode = generateUniqueCode();
        const person = await Person.create({
            ...req.body,
            uniqueCode
        });
        res.status(201).json(person);
    } catch (error) {
        console.error('Create person error:', error);
        res.status(500).json({ error: 'Kişi oluşturulurken hata oluştu' });
    }
});

// Update person
router.put('/:id', async (req, res) => {
    try {
        const person = await Person.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!person) {
            return res.status(404).json({ error: 'Kişi bulunamadı' });
        }
        res.json(person);
    } catch (error) {
        console.error('Update person error:', error);
        res.status(500).json({ error: 'Kişi güncellenirken hata oluştu' });
    }
});

// Delete person
router.delete('/:id', async (req, res) => {
    try {
        const person = await Person.findByIdAndDelete(req.params.id);
        if (!person) {
            return res.status(404).json({ error: 'Kişi bulunamadı' });
        }
        res.json({ message: 'Kişi başarıyla silindi' });
    } catch (error) {
        console.error('Delete person error:', error);
        res.status(500).json({ error: 'Kişi silinirken hata oluştu' });
    }
});

// Export to Excel
router.get('/export/excel', async (req, res) => {
    try {
        const { hostname, btnName, btnLink } = req.query;
        const host = hostname || 'localhost';

        const persons = await Person.find().sort({ createdAt: -1 });

        const data = [
            ['Kod', 'İsim', 'Soyisim', 'Telefon', 'Email', 'İl', 'İlçe', 'Mahalle', 'Sokak', 'Bina No', 'Daire No', 'Posta Kodu', 'Tam Adres', 'Link']
        ];

        for (const p of persons) {
            let link = `http://${host}:4000/?r=${p.uniqueCode}`;
            if (btnName && btnLink) {
                link += `&btnName=${encodeURIComponent(btnName)}&btnLink=${encodeURIComponent(btnLink)}`;
            }

            data.push([
                p.uniqueCode || '',
                p.firstName || '',
                p.lastName || '',
                p.phone || '',
                p.email || '',
                p.province || '',
                p.district || '',
                p.neighborhood || '',
                p.street || '',
                p.buildingNo || '',
                p.apartmentNo || '',
                p.postalCode || '',
                p.fullAddress || '',
                link
            ]);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kişiler');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=kisiler.xlsx');
        res.send(buffer);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Excel export sırasında hata oluştu' });
    }
});

// Import from Excel
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Excel dosyası gerekli' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        const columnMapping = {
            'isim': 'firstName',
            'ad': 'firstName',
            'soyisim': 'lastName',
            'soyad': 'lastName',
            'telefon': 'phone',
            'tel': 'phone',
            'email': 'email',
            'mail': 'email',
            'eposta': 'email',
            'il': 'province',
            'ilce': 'district',
            'ilçe': 'district',
            'mahalle': 'neighborhood',
            'sokak': 'street',
            'cadde': 'street',
            'bina no': 'buildingNo',
            'bina': 'buildingNo',
            'binano': 'buildingNo',
            'daire no': 'apartmentNo',
            'daire': 'apartmentNo',
            'daireno': 'apartmentNo',
            'posta kodu': 'postalCode',
            'postakodu': 'postalCode',
            'pk': 'postalCode',
            'tam adres': 'fullAddress',
            'adres': 'fullAddress',
            'tamadres': 'fullAddress',
            'mahalle/köy': 'neighborhood',
            'mah.': 'neighborhood',
            'mah': 'neighborhood',
            'semt': 'neighborhood',
            'sokak/cadde': 'street',
            'cad': 'street',
            'cad.': 'street',
            'sok': 'street',
            'sok.': 'street',
            'kapı no': 'buildingNo',
            'kapi no': 'buildingNo',
            'kapı': 'buildingNo',
            'kapi': 'buildingNo',
            'dış kapı no': 'buildingNo',
            'dis kapi no': 'buildingNo',
            'no': 'buildingNo',
            'iç kapı no': 'apartmentNo',
            'ic kapi no': 'apartmentNo',
            'daire no': 'apartmentNo',
            'ic kapi': 'apartmentNo',
            'iç kapı': 'apartmentNo'
        };

        const persons = [];
        for (const row of data) {
            const person = {};

            for (const [key, value] of Object.entries(row)) {
                const normalizedKey = key.toLocaleLowerCase('tr').trim();
                const mappedKey = columnMapping[normalizedKey];

                if (mappedKey) {
                    person[mappedKey] = String(value).trim();
                }
            }

            if (person.firstName && person.lastName) {
                person.uniqueCode = generateUniqueCode();
                persons.push(person);
            } else if (person.firstName && !person.lastName) {
                // İsim dolu soyisim boşsa, ismi parçala (sondaki kelime soyisim olur)
                const nameParts = person.firstName.trim().split(/\s+/);
                if (nameParts.length >= 2) {
                    person.lastName = nameParts.pop(); // Sondaki kelime soyisim
                    person.firstName = nameParts.join(' '); // Geri kalanlar isim
                    person.uniqueCode = generateUniqueCode();
                    persons.push(person);
                }
            }
        }

        if (persons.length === 0) {
            return res.status(400).json({
                error: 'Geçerli kişi bulunamadı. Lütfen Excel dosyasının en az "isim" ve "soyisim" sütunlarını içerdiğinden emin olun.'
            });
        }

        const createdPersons = await Person.insertMany(persons);

        res.json({
            message: `${createdPersons.length} kişi başarıyla eklendi`,
            count: createdPersons.length
        });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Excel import sırasında hata oluştu' });
    }
});

module.exports = router;
