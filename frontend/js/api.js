// API Configuration
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = isProduction
    ? 'https://backendbg.ozpinar.live/api'
    : `http://${window.location.hostname}:3001/api`;

// Toast notification
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Fetch wrapper with auth
async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        ...options.headers
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401 && window.location.pathname.includes('/admin')) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }
            throw new Error(data.error || 'Bir hata oluştu');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// API methods
const API = {
    auth: {
        login: (email, password) => fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),
        verify: () => fetchAPI('/auth/verify')
    },

    persons: {
        getAll: (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return fetchAPI(`/persons${query ? '?' + query : ''}`);
        },
        getOne: (id) => fetchAPI(`/persons/${id}`),
        create: (data) => fetchAPI('/persons', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchAPI(`/persons/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchAPI(`/persons/${id}`, { method: 'DELETE' }),
        import: (file) => {
            const formData = new FormData();
            formData.append('file', file);
            return fetchAPI('/persons/import', {
                method: 'POST',
                body: formData
            });
        }
    },

    public: {
        getByCode: (code) => fetchAPI(`/public/${code}`),
        submit: (uniqueCode, data) => fetchAPI('/public/submit', {
            method: 'POST',
            body: JSON.stringify({ uniqueCode, data })
        })
    },

    changes: {
        getAll: (status = 'pending') => fetchAPI(`/changes?status=${status}`),
        approve: (id, addToSystem) => fetchAPI(`/changes/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ addToSystem })
        }),
        reject: (id) => fetchAPI(`/changes/${id}/reject`, { method: 'POST' }),
        getPendingCount: () => fetchAPI('/changes/pending-count')
    },

    address: {
        getProvinces: () => fetchAPI('/address/provinces'),
        getDistricts: (provinceId) => fetchAPI(`/address/districts/${provinceId}`),
        getNeighborhoods: (provinceId, districtId) =>
            fetchAPI(`/address/neighborhoods/${provinceId}/${districtId}`),
        getStreets: (provinceId, districtId, neighborhoodId) =>
            fetchAPI(`/address/streets/${provinceId}/${districtId}/${neighborhoodId}`)
    }
};
