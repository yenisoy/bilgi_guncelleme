const bcrypt = require('bcryptjs');
const { User } = require('../models');

const seedAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const existingAdmin = await User.findOne({ email: adminEmail });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await User.create({
                email: adminEmail,
                password: hashedPassword
            });
            console.log(`Admin kullanıcısı oluşturuldu: ${adminEmail}`);
        } else {
            console.log('Admin kullanıcısı zaten mevcut');
        }
    } catch (error) {
        console.error('Admin seed hatası:', error);
    }
};

module.exports = { seedAdmin };
