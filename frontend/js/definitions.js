// State
let currentTab = 'province'; // province, district, neighborhood
let provinces = [];
let districts = [];
let selectedProvinceId = null;
let selectedDistrictId = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return;
    }

    loadPendingCount();
    setupFilters('province');
    loadData();

    document.getElementById('add-form').addEventListener('submit', handleAddSubmit);
});

async function switchTab(tab) {
    currentTab = tab;
    // Reset filters for deeper tabs
    if (tab === 'province') {
        selectedProvinceId = null;
        selectedDistrictId = null;
    } else if (tab === 'district') {
        selectedDistrictId = null;
    }

    setupFilters(tab);
    await loadFiltersData();
    loadData();
}

function setupFilters(tab) {
    const container = document.getElementById('filters-container');
    container.innerHTML = '';

    // Search Box (Common)
    const searchCol = document.createElement('div');
    searchCol.className = 'col-md-4';
    searchCol.innerHTML = `
        <label class="form-label text-muted small fw-bold">Ara</label>
        <input type="text" id="search-input" class="form-control form-control-custom" placeholder="İsim ile ara...">
    `;
    searchCol.querySelector('input').addEventListener('input', debounce(loadData, 500));
    container.appendChild(searchCol);

    if (tab === 'district' || tab === 'neighborhood') {
        // Province Filter
        const provCol = document.createElement('div');
        provCol.className = 'col-md-3';
        provCol.innerHTML = `
            <label class="form-label text-muted small fw-bold">İl Filtresi</label>
            <select id="filter-province" class="form-select form-control-custom">
                <option value="">Tümü</option>
            </select>
        `;
        provCol.querySelector('select').addEventListener('change', async (e) => {
            selectedProvinceId = e.target.value;
            selectedDistrictId = null; // Reset district
            if (tab === 'neighborhood') {
                await loadDistrictOptions(selectedProvinceId);
            }
            loadData();
        });
        container.appendChild(provCol);
    }

    if (tab === 'neighborhood') {
        // District Filter
        const distCol = document.createElement('div');
        distCol.className = 'col-md-3';
        distCol.innerHTML = `
            <label class="form-label text-muted small fw-bold">İlçe Filtresi</label>
            <select id="filter-district" class="form-select form-control-custom" disabled>
                <option value="">Önce İl Seçin</option>
            </select>
        `;
        distCol.querySelector('select').addEventListener('change', (e) => {
            selectedDistrictId = e.target.value;
            loadData();
        });
        container.appendChild(distCol);
    }
}

async function loadFiltersData() {
    if (currentTab !== 'province') {
        // Load provinces for filter
        try {
            provinces = await API.address.getProvinces();
            const select = document.getElementById('filter-province');
            if (select) {
                select.innerHTML = '<option value="">Tümü</option>' +
                    provinces.map(p => `<option value="${p.id}" ${selectedProvinceId === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
            }

            // If checking neighborhood and province is selected, load districts
            if (currentTab === 'neighborhood' && selectedProvinceId) {
                await loadDistrictOptions(selectedProvinceId);
            }
        } catch (error) {
            console.error(error);
        }
    }
}

async function loadDistrictOptions(provinceId) {
    const select = document.getElementById('filter-district');
    if (!select) return;

    if (!provinceId) {
        select.innerHTML = '<option value="">Önce İl Seçin</option>';
        select.disabled = true;
        return;
    }

    select.disabled = false;
    select.innerHTML = '<option value="">Yükleniyor...</option>';

    try {
        const districts = await API.address.getDistricts(provinceId);
        select.innerHTML = '<option value="">Tümü</option>' +
            districts.map(d => `<option value="${d.id}" ${selectedDistrictId === d.id ? 'selected' : ''}>${d.name}</option>`).join('');
    } catch (error) {
        select.innerHTML = '<option value="">Hata</option>';
    }
}

async function loadData() {
    const loading = document.getElementById('loading');
    const tbody = document.getElementById('table-body');
    const empty = document.getElementById('empty-state');
    const search = document.getElementById('search-input').value;

    loading.style.display = 'block';
    tbody.innerHTML = '';
    empty.style.display = 'none';

    try {
        // Prepare query params
        const params = new URLSearchParams();
        params.append('type', currentTab);
        if (search) params.append('search', search);

        let parentId = null;
        if (currentTab === 'district') parentId = selectedProvinceId;
        if (currentTab === 'neighborhood') parentId = selectedDistrictId;

        if (parentId) params.append('parentId', parentId);

        // Fetch using custom added Fetch wrapper in api.js? 
        // We need to add the management endpoints to API object in api.js or call directly
        // Let's assume we'll update api.js or duplicate fetch here for speed
        const response = await fetchWithAuth(`/address-management/list?${params.toString()}`);
        console.log('Load Data Response:', response);

        loading.style.display = 'none';

        if (!response || response.length === 0) {
            console.warn('No data found for current filter');
            empty.style.display = 'block';
            return;
        }

        // Update Table Header based on Tab
        const thead = document.querySelector('#data-table thead tr');
        if (currentTab === 'province') {
            thead.innerHTML = `
                <th>Ad</th>
                <th>Durum</th>
                <th class="text-end">İşlemler</th>
            `;
        } else if (currentTab === 'district') {
            thead.innerHTML = `
                <th>Ad</th>
                <th>İl</th>
                <th>Durum</th>
                <th class="text-end">İşlemler</th>
            `;
        } else if (currentTab === 'neighborhood') {
            thead.innerHTML = `
                <th>Ad</th>
                <th>İl</th>
                <th>İlçe</th>
                <th>Durum</th>
                <th class="text-end">İşlemler</th>
            `;
        }

        tbody.innerHTML = response.map(item => {
            let extraCols = '';
            if (currentTab === 'district') {
                extraCols = `<td>${item.provinceName || '-'}</td>`;
            } else if (currentTab === 'neighborhood') {
                extraCols = `
                    <td>${item.provinceName || '-'}</td>
                    <td>${item.districtName || '-'}</td>
                `;
            }

            return `
            <tr>
                <td>
                    ${item.name}
                    ${item.isManual ? '<span class="manual-badge"><i class="fas fa-pen"></i> Manuel</span>' : ''}
                </td>
                ${extraCols}
                <td>
                    ${item.isManual ? '<span class="badge bg-info text-dark">Eklenen</span>' : '<span class="badge bg-light text-dark border">Sistem</span>'}
                </td>
                <td class="text-end">
                    ${item.isManual ? `
                        <button onclick="deleteItem('${item.id}')" class="btn btn-action-delete btn-sm">
                            <i class="fas fa-trash"></i> Sil
                        </button>
                    ` : ''}
                </td>
            </tr>
            `;
        }).join('');

    } catch (error) {
        loading.style.display = 'none';
        showToast('Veriler yüklenirken hata oluştu', 'error');
    }
}

async function handleAddSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('add-name').value.trim();
    if (!name) return;

    let parentId = null;
    if (currentTab === 'district') {
        if (!selectedProvinceId) {
            showToast('Lütfen önce filtrelerden bir İl seçin', 'error');
            return;
        }
        parentId = selectedProvinceId;
    } else if (currentTab === 'neighborhood') {
        if (!selectedDistrictId) {
            showToast('Lütfen önce filtrelerden İl ve İlçe seçin', 'error');
            return;
        }
        parentId = selectedDistrictId;
    }

    try {
        const response = await fetchWithAuth('/address-management/add', 'POST', {
            type: currentTab,
            parentId,
            name
        });

        showToast('Kayıt başarıyla eklendi', 'success');
        closeAddModal();
        loadData();
    } catch (error) {
        showToast(error.message || 'Ekleme başarısız', 'error');
    }
}

async function deleteItem(id) {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;

    try {
        await fetchWithAuth(`/address-management/${id}`, 'DELETE');
        showToast('Kayıt silindi', 'success');
        loadData();
    } catch (error) {
        showToast(error.message || 'Silme işlemi başarısız', 'error');
    }
}

// Modal Helpers
function openAddModal() {
    // Validate context
    if (currentTab === 'district' && !selectedProvinceId) {
        showToast('İlçe eklemek için lütfen filtreden bir İl seçin', 'info');
        return;
    }
    if (currentTab === 'neighborhood' && !selectedDistrictId) {
        showToast('Mahalle eklemek için lütfen filtreden İl ve İlçe seçin', 'info');
        return;
    }

    document.getElementById('modal-title').textContent =
        currentTab === 'province' ? 'Yeni İl Ekle' :
            currentTab === 'district' ? 'Yeni İlçe Ekle' : 'Yeni Mahalle Ekle';

    document.getElementById('add-form').reset();
    document.getElementById('add-modal').style.display = 'block';
    document.getElementById('add-modal').classList.add('show');
}

function closeAddModal() {
    document.getElementById('add-modal').style.display = 'none';
}

// Utils
async function fetchWithAuth(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    // Use global API_BASE_URL from api.js if available, otherwise fallback
    const baseUrl = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '/api';

    // Remove /api prefix if endpoint already has it or if base url includes it
    // Endpoint passed here is usually /address-management/... which doesn't start with /api
    // API_BASE_URL is .../api

    const url = `${baseUrl}${endpoint}`;
    console.log(`Fetching: ${url}`); // Debug log

    const res = await fetch(url, options);

    // Check if response is JSON
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Sunucudan geçersiz yanıt alındı (JSON değil).");
    }

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'API Hatası');
    return data;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadPendingCount() {
    try {
        const response = await API.changes.getPendingCount();
        const badge = document.getElementById('pending-badge');
        if (response.count > 0) {
            badge.textContent = response.count;
            badge.style.display = 'inline-flex';
        }
    } catch (error) { console.error(error); }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}
