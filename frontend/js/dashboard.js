// Dashboard page logic
let currentPage = 1;
const ITEMS_PER_PAGE = 10;
let allPersons = [];
let phoneInput; // Global instance for intl-tel-input
let totalPages = 1;
let editingPersonId = null;

// Initialize Phone Input
function initPhoneInput() {
    try {
        if (!window.intlTelInput) {
            console.warn('IntlTelInput not loaded');
            return;
        }

        const input = document.querySelector("#phone");
        if (input) {
            phoneInput = window.intlTelInput(input, {
                initialCountry: "tr",
                separateDialCode: true,
                utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js",
                preferredCountries: ["tr", "us", "gb", "de"],
                autoPlaceholder: "aggressive"
            });

            // Auto-update flag when user types a country code directly (e.g. +49)
            input.addEventListener('input', function () {
                const val = input.value;
                if (val.startsWith('+')) {
                    // intl-tel-input handles pasting well.
                }
            });

            // Requirement: If flag changes, ensure input doesn't keep old code artifacts
            input.addEventListener('countrychange', function () {
                // Get the current number (which might include the old code if dirty)
                // and try to strip it? 
                // Actually, it's safer to let the user re-type if they are switching countries completely.
                // But we can clear the input if it looks like a full number with code.
                // For now, let's trust intl-tel-input's default behavior which is usually correct for clean inputs.
            });
        }
    } catch (error) {
        console.error('Phone input init error:', error);
    }
}

// Initialize on page load
// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return;
    }

    loadPersons();
    initPhoneInput();
    loadPendingCount();
    initAddressSelector();

    // Setup form submit
    document.getElementById('person-form').addEventListener('submit', handleFormSubmit);

    // Setup search on enter
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadPersons();
    });
});

async function loadPersons() {
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');
    const tableContainer = document.getElementById('table-container');
    const pagination = document.getElementById('pagination');
    const search = document.getElementById('search-input').value;

    loading.style.display = 'flex';
    emptyState.style.display = 'none';
    tableContainer.style.display = 'none';

    try {
        const response = await API.persons.getAll({ page: currentPage, limit: 15, search });
        console.log('loadPersons response:', response); // DEBUG LOG

        loading.style.display = 'none';

        if (response.persons.length === 0) {
            emptyState.style.display = 'block';
            pagination.style.display = 'none';
            return;
        }

        totalPages = response.pagination.pages;
        renderPersonsTable(response.persons);
        updatePagination(response.pagination);

        tableContainer.style.display = 'block';
        // Only show pagination if there is more than 1 page
        if (response.pagination.pages > 1) {
            pagination.style.display = 'flex';
        } else {
            pagination.style.display = 'none';
        }
    } catch (error) {
        loading.style.display = 'none';
        showToast('Kişiler yüklenirken hata oluştu', 'error');
    }
}

function renderPersonsTable(persons) {
    const tbody = document.getElementById('persons-table');
    tbody.innerHTML = persons.map(person => `
        <tr>
            <td>
                <span class="code-badge" onclick="copyLink('${person.uniqueCode}', this)" title="Linki kopyala" style="cursor: pointer;">
                    ${person.uniqueCode}
                </span>
            </td>
            <td>
                <div class="fw-bold text-dark">${person.firstName} ${person.lastName}</div>
            </td>
            <td>${person.phone || '-'}</td>
            <td>${person.email || '-'}</td>
            <td>${person.province ? `${person.province}/${person.district || ''}` : '-'}</td>
            <td>
                <div class="d-flex gap-2">
                    <button onclick="openModal('edit', '${person._id}')" class="btn-action-edit">Düzenle</button>
                    <button onclick="deletePerson('${person._id}', '${person.firstName} ${person.lastName}')" class="btn-action-delete">Sil</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updatePagination(pagination) {
    document.getElementById('total-count').textContent = `Toplam ${pagination.total} kişi`;
    document.getElementById('page-info').textContent = `${pagination.page} / ${pagination.pages}`;
    document.getElementById('prev-btn').disabled = pagination.page <= 1;
    document.getElementById('next-btn').disabled = pagination.page >= pagination.pages;
}

function changePage(delta) {
    currentPage += delta;
    loadPersons();
}

function copyLink(code, element) {
    let link = `${window.location.origin}/?r=${code}`;

    const btnName = document.getElementById('btn-name-input').value.trim();
    const btnLink = document.getElementById('btn-link-input').value.trim();

    if (btnName && btnLink) {
        link += `&btnName=${encodeURIComponent(btnName)}&btnLink=${encodeURIComponent(btnLink)}`;
    }

    // Visual Feedback Helper
    const showSuccess = () => {
        showToast('Link kopyalandı!', 'success');
        if (element) {
            const originalText = element.textContent;
            const originalStyle = element.style.cssText;

            element.textContent = 'Kopyalandı!';
            element.style.backgroundColor = '#10b981'; // Green
            element.style.color = 'white';
            element.style.borderColor = '#10b981';

            setTimeout(() => {
                element.textContent = originalText;
                element.style.cssText = originalStyle;
            }, 1500);
        }
    };

    // Try modern API first, fall back to legacy if needed (for HTTP LAN)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link).then(() => {
            showSuccess();
        }).catch(() => {
            fallbackCopy(link, showSuccess);
        });
    } else {
        fallbackCopy(link, showSuccess);
    }
}

function fallbackCopy(text, onSuccess) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Ensure it's not visible but part of DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            if (onSuccess) onSuccess();
            else showToast('Link kopyalandı!', 'success');
        } else {
            showToast('Kopyalama başarısız', 'error');
        }
    } catch (err) {
        console.error('Copy failed', err);
        showToast('Kopyalama hatası', 'error');
    }

    document.body.removeChild(textArea);
}

async function deletePerson(id, name) {
    if (!confirm(`${name} kişisini silmek istediğinize emin misiniz?`)) return;

    try {
        await API.persons.delete(id);
        showToast('Kişi silindi', 'success');
        loadPersons();
    } catch (error) {
        showToast(error.message || 'Silme sırasında hata oluştu', 'error');
    }
}

async function openModal(mode, personId = null) {
    editingPersonId = personId;

    document.getElementById('modal-title').textContent = mode === 'add' ? 'Yeni Kişi Ekle' : 'Kişi Düzenle';
    document.getElementById('person-form').reset();

    // Reset address selects
    resetAddressSelects();

    if (personId) {
        try {
            const person = await API.persons.getOne(personId);
            document.getElementById('firstName').value = person.firstName || '';
            document.getElementById('lastName').value = person.lastName || '';
            document.getElementById('email').value = person.email || '';
            // Set phone number using intl-tel-input
            if (phoneInput) {
                let phone = person.phone || '';

                // Normalization Helper for TR numbers to prevent duplication (+9090...)
                if (phone) {
                    // 1. Remove confusing characters if any (keep +, digits)
                    // phone = phone.replace(/[^0-9+]/g, ''); 

                    // 2. Fix specific bad patterns
                    // Check if it starts with +9090 (Duplicate code)
                    if (phone.startsWith('+9090')) {
                        phone = '+90' + phone.substring(5);
                    }
                    // Check if it starts with 905... (Missing +)
                    else if (phone.startsWith('905') && phone.length === 12) {
                        phone = '+' + phone;
                    }
                    // Check if it starts with 05... (Local format) -> Convert to +90
                    else if (phone.startsWith('05') && phone.length === 11) {
                        phone = '+90' + phone.substring(1);
                    }
                    // Check if it starts with 5... (National format, 10 digits) -> Convert to +90
                    else if (phone.startsWith('5') && phone.length === 10) {
                        phone = '+90' + phone;
                    }
                }

                phoneInput.setNumber(phone);
            } else {
                document.getElementById('phone').value = person.phone || '';
            }
            document.getElementById('street').value = person.street || '';
            document.getElementById('buildingNo').value = person.buildingNo || '';
            document.getElementById('apartmentNo').value = person.apartmentNo || '';
            document.getElementById('postalCode').value = person.postalCode || '';
            document.getElementById('fullAddress').value = person.fullAddress || '';

            // Populate address dropdowns
            if (person.province) {
                setTimeout(async () => {
                    const provinceSelect = document.getElementById('province');
                    // Find and select province
                    for (const opt of provinceSelect.options) {
                        if (opt.value === person.province) {
                            opt.selected = true;
                            selectedProvince = { id: opt.dataset.id, name: person.province };

                            // Load districts
                            try {
                                districts = await API.address.getDistricts(selectedProvince.id);
                                const districtSelect = document.getElementById('district');
                                districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
                                districts.forEach(d => {
                                    const option = document.createElement('option');
                                    option.value = d.name;
                                    option.textContent = d.name;
                                    option.dataset.id = d.id;
                                    if (d.name === person.district) option.selected = true;
                                    districtSelect.appendChild(option);
                                });
                                districtSelect.disabled = false;

                                // If district selected, load neighborhoods
                                const selectedDistrictOpt = districtSelect.selectedOptions[0];
                                if (selectedDistrictOpt && selectedDistrictOpt.dataset.id) {
                                    selectedDistrict = { id: selectedDistrictOpt.dataset.id, name: person.district };

                                    neighborhoods = await API.address.getNeighborhoods(selectedProvince.id, selectedDistrict.id);
                                    const neighborhoodSelect = document.getElementById('neighborhood');
                                    neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';
                                    neighborhoods.forEach(n => {
                                        const option = document.createElement('option');
                                        option.value = n.name;
                                        option.textContent = n.name;
                                        option.dataset.id = n.id;
                                        if (n.name === person.neighborhood) option.selected = true;
                                        neighborhoodSelect.appendChild(option);
                                    });
                                    neighborhoodSelect.disabled = false;

                                    // Set selected neighborhood state
                                    const selectedNeighborhoodOpt = neighborhoodSelect.selectedOptions[0];
                                    if (selectedNeighborhoodOpt && selectedNeighborhoodOpt.dataset.id) {
                                        selectedNeighborhood = { id: selectedNeighborhoodOpt.dataset.id, name: person.neighborhood };
                                    }
                                }
                            } catch (e) { console.error(e); }
                            break;
                        }
                    }
                }, 500);
            }

        } catch (error) {
            console.error(error);
            showToast('Kişi bilgileri yüklenemedi', 'error');
            return;
        }
    }

    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    editingPersonId = null;
}

function resetAddressSelects() {
    document.getElementById('province').innerHTML = '<option value="">İl Seçin</option>';
    document.getElementById('district').innerHTML = '<option value="">İlçe Seçin</option>';
    document.getElementById('neighborhood').innerHTML = '<option value="">Mahalle Seçin</option>';
    document.getElementById('street').innerHTML = '<option value="">Sokak Seçin</option>';

    document.getElementById('district').disabled = true;
    document.getElementById('neighborhood').disabled = true;
    document.getElementById('street').disabled = true;

    // Re-load provinces
    loadProvinces();
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const data = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        // Use intl-tel-input full number if available
        phone: phoneInput ? phoneInput.getNumber() : document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),

        address: {
            province: document.getElementById('province').value,
            district: document.getElementById('district').value,
            neighborhood: document.getElementById('neighborhood').value,
            street: document.getElementById('street').value,
            buildingNo: document.getElementById('buildingNo').value,
            apartmentNo: document.getElementById('apartmentNo').value,
            postalCode: document.getElementById('postalCode').value.trim(),
            fullAddress: document.getElementById('fullAddress').value.trim()
        }
    };

    if (!data.firstName || !data.lastName) {
        showToast('İsim ve soyisim zorunludur', 'error');
        return;
    }

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Kaydediliyor...';

    try {
        if (editingPersonId) {
            await API.persons.update(editingPersonId, data);
            showToast('Kişi güncellendi', 'success');
        } else {
            await API.persons.create(data);
            showToast('Kişi oluşturuldu', 'success');
        }
        closeModal();
        loadPersons();
    } catch (error) {
        showToast(error.message || 'Kaydetme sırasında hata oluştu', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Kaydet';
    }
}

async function loadPendingCount() {
    try {
        const response = await API.changes.getPendingCount();
        const badge = document.getElementById('pending-badge');
        if (response.count > 0) {
            badge.textContent = response.count;
            badge.style.display = 'inline-flex';
        }
    } catch (error) {
        console.error('Error loading pending count:', error);
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

// Export to Excel
async function exportToExcel() {
    try {
        const btnName = document.getElementById('btn-name-input').value.trim();
        const btnLink = document.getElementById('btn-link-input').value.trim();

        let queryParams = '';
        if (btnName) queryParams += `btnName=${encodeURIComponent(btnName)}`;
        if (btnLink) queryParams += `${queryParams ? '&' : ''}btnLink=${encodeURIComponent(btnLink)}`;

        showToast('Excel hazırlanıyor...', 'success');
        const token = localStorage.getItem('token');

        // Use updated API_BASE_URL logic directly or construct it similarly
        // Since we are doing a direct fetch here (not via API wrapper for blob handling easily? actually API wrapper might work but this is custom)
        // Let's stick to the existing fetch pattern but append params
        const response = await fetch(`/api/persons/export/excel?${queryParams}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Export başarısız');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kisiler.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();

        showToast('Excel indirildi!', 'success');
    } catch (error) {
        console.error(error);
        showToast('Excel export sırasında hata oluştu', 'error');
    }
}

// Sync Addresses
async function syncAddresses() {
    if (!confirm('Tüm Türkiye adres verisini (İl, İlçe, Mahalle) güncellemek istiyor musunuz?\n\nBu işlem 5-10 dakika sürebilir ve arka planda çalışır.')) return;

    try {
        showToast('Senkronizasyon başlatılıyor...', 'success');
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/address/sync`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('Sunucu yanıtı okunamadı. Backend servisini yeniden başlatın.');
        }

        if (!response.ok) throw new Error(data.error || 'İşlem başarısız');

        showToast(data.message, 'success');
    } catch (error) {
        showToast(error.message || 'Senkronizasyon hatası', 'error');
    }
}
let provinces = [];
let districts = [];
let neighborhoods = [];
let streets = [];
let selectedProvince = null;
let selectedDistrict = null;
let selectedNeighborhood = null;

function initAddressSelector() {
    document.getElementById('province').addEventListener('change', onProvinceChange);
    document.getElementById('district').addEventListener('change', onDistrictChange);
    document.getElementById('neighborhood').addEventListener('change', onNeighborhoodChange);
}

async function loadProvinces() {
    const select = document.getElementById('province');
    select.innerHTML = '<option value="">İl Seçin</option>';

    try {
        provinces = await API.address.getProvinces();
        provinces.forEach(p => {
            const option = document.createElement('option');
            option.value = p.name;
            option.textContent = p.name;
            option.dataset.id = p.id;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading provinces:', error);
    }
}

async function onProvinceChange(e) {
    const provinceName = e.target.value;
    const provinceOption = e.target.selectedOptions[0];
    selectedProvince = provinceOption?.dataset.id ? { id: provinceOption.dataset.id, name: provinceName } : null;

    resetSelect('district');
    resetSelect('neighborhood');
    resetSelect('street');

    if (!selectedProvince) return;

    try {
        districts = await API.address.getDistricts(selectedProvince.id);
        const select = document.getElementById('district');
        select.innerHTML = '<option value="">İlçe Seçin</option>';
        districts.forEach(d => {
            const option = document.createElement('option');
            option.value = d.name;
            option.textContent = d.name;
            option.dataset.id = d.id;
            select.appendChild(option);
        });
        select.disabled = false;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function onDistrictChange(e) {
    const districtOption = e.target.selectedOptions[0];
    selectedDistrict = districtOption?.dataset.id ? { id: districtOption.dataset.id } : null;

    resetSelect('neighborhood');
    resetSelect('street');

    if (!selectedProvince || !selectedDistrict) return;

    try {
        neighborhoods = await API.address.getNeighborhoods(selectedProvince.id, selectedDistrict.id);
        const select = document.getElementById('neighborhood');
        select.innerHTML = '<option value="">Mahalle Seçin</option>';
        neighborhoods.forEach(n => {
            const option = document.createElement('option');
            option.value = n.name;
            option.textContent = n.name;
            option.dataset.id = n.id;
            select.appendChild(option);
        });
        select.disabled = false;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function onNeighborhoodChange(e) {
    const neighborhoodOption = e.target.selectedOptions[0];
    selectedNeighborhood = neighborhoodOption?.dataset.id ? { id: neighborhoodOption.dataset.id } : null;

    resetSelect('street');

    if (!selectedProvince || !selectedDistrict || !selectedNeighborhood) return;

    try {
        streets = await API.address.getStreets(selectedProvince.id, selectedDistrict.id, selectedNeighborhood.id);
        const select = document.getElementById('street');
        select.innerHTML = '<option value="">Sokak Seçin</option>';
        streets.forEach(s => {
            const option = document.createElement('option');
            option.value = s.name;
            option.textContent = s.name;
            select.appendChild(option);
        });
        select.disabled = false;
    } catch (error) {
        console.error('Error:', error);
    }
}

function resetSelect(id) {
    const element = document.getElementById(id);
    if (!element) return;

    if (element.tagName === 'INPUT') {
        element.value = '';
        // element.disabled = true; // Sokak input'u her zaman aktif kalmalı
    } else {
        const defaults = { district: 'İlçe Seçin', neighborhood: 'Mahalle Seçin' };
        element.innerHTML = `<option value="">${defaults[id] || 'Seçiniz'}</option>`;
        element.disabled = true;
    }
}
