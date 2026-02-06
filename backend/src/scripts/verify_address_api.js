const http = require('http');

const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'admin123';

function postRequest(path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api' + path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });

        req.on('error', (e) => reject(e));
        req.write(body);
        req.end();
    });
}

function getRequest(path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api' + path,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function verify() {
    try {
        console.log('1. Logging in...');
        const loginRes = await postRequest('/auth/login', JSON.stringify({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        }));

        if (loginRes.status !== 200) {
            console.error('Login failed:', loginRes.body);
            return;
        }

        const token = JSON.parse(loginRes.body).token;
        console.log('Login successful. Token obtained.');

        console.log('2. Fetching Address List (Provinces)...');
        const listRes = await getRequest('/address-management/list?type=province', token);

        console.log('Status:', listRes.status);
        if (listRes.status !== 200) {
            console.error('List failed:', listRes.body);
            return;
        }

        const listData = JSON.parse(listRes.body);
        console.log(`Found ${listData.length} items.`);

        if (listData.length > 0) {
            console.log('First item:', listData[0]);
        }

    } catch (error) {
        console.error('Verification error:', error);
    }
}

verify();
