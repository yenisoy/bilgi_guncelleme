// =============================================
// Bilgi Doğrulama - Public Form JavaScript
// =============================================

const API_BASE_URL = '/api';

// State
let refCode = null;
let personExists = false;
let provinces = [];
let selectedProvince = null;
let selectedDistrict = null;
let selectedNeighborhood = null;
let dynamicBtnConfig = { text: null, url: null };

// Helper: Normalize String
const normalize = (str) => str ? str.toLocaleLowerCase('tr').replace(/İ/g, 'i').replace(/I/g, 'ı').trim() : '';

// =============================================
// Toast Notification
// =============================================
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

// =============================================
// API Functions
// =============================================
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Bir hata oluştu');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

const API = {
    public: {
        getByCode: (code) => fetchAPI(`/public/${code}`),
        submit: (uniqueCode, data) => fetchAPI('/public/submit', {
            method: 'POST',
            body: JSON.stringify({ uniqueCode, data })
        })
    },
    address: {
        getProvinces: () => fetchAPI('/address/provinces'),
        getDistricts: (provinceId) => fetchAPI(`/address/districts/${provinceId}`),
        getNeighborhoods: (provinceId, districtId) =>
            fetchAPI(`/address/neighborhoods/${provinceId}/${districtId}`)
    }
};

// =============================================
// Address Selector
// =============================================
async function loadProvinces() {
    console.log('Loading provinces...');
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
        showToast('İller yüklenirken hata oluştu', 'error');
    }
}

async function onProvinceChange(e) {
    const provinceName = e.target.value;
    const provinceOption = e.target.selectedOptions[0];

    selectedProvince = provinceOption?.dataset.id ? { id: provinceOption.dataset.id, name: provinceName } : null;
    selectedDistrict = null;
    selectedNeighborhood = null;

    resetSelect('district');
    resetSelect('neighborhood');
    resetSelect('street');

    if (!selectedProvince) return;

    const districtSelect = document.getElementById('district');

    try {
        const districts = await API.address.getDistricts(selectedProvince.id);
        districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
        districts.forEach(d => {
            const option = document.createElement('option');
            option.value = d.name;
            option.textContent = d.name;
            option.dataset.id = d.id;
            districtSelect.appendChild(option);
        });
        districtSelect.disabled = false;
    } catch (error) {
        console.error('Error loading districts:', error);
    }
}

async function onDistrictChange(e) {
    const districtName = e.target.value;
    const districtOption = e.target.selectedOptions[0];

    selectedDistrict = districtOption?.dataset.id ? { id: districtOption.dataset.id, name: districtName } : null;
    selectedNeighborhood = null;

    resetSelect('neighborhood');
    resetSelect('street');

    if (!selectedProvince || !selectedDistrict) return;

    const neighborhoodSelect = document.getElementById('neighborhood');

    try {
        const neighborhoods = await API.address.getNeighborhoods(selectedProvince.id, selectedDistrict.id);
        neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';
        neighborhoods.forEach(n => {
            const option = document.createElement('option');
            option.value = n.name;
            option.textContent = n.name;
            option.dataset.id = n.id;
            neighborhoodSelect.appendChild(option);
        });

        // Add 'Other' option
        const otherOption = document.createElement('option');
        otherOption.value = 'other';
        otherOption.textContent = 'Diğer (Listede Yok)';
        neighborhoodSelect.appendChild(otherOption);

        neighborhoodSelect.disabled = false;
    } catch (error) {
        console.error('Error loading neighborhoods:', error);
    }
}

function onNeighborhoodChange(e) {
    const value = e.target.value;
    const manualContainer = document.getElementById('manual-neighborhood-container');
    const manualInput = document.getElementById('manualNeighborhood');

    if (value === 'other') {
        manualContainer.style.display = 'block';
        manualInput.required = true;
    } else {
        manualContainer.style.display = 'none';
        manualInput.required = false;
        manualInput.value = '';
    }
}

function resetSelect(id) {
    const element = document.getElementById(id);
    if (!element) return;

    if (element.tagName === 'INPUT') {
        element.value = '';
    } else {
        const defaults = {
            district: 'İlçe Seçin',
            neighborhood: 'Mahalle Seçin'
        };
        element.innerHTML = `<option value="">${defaults[id]}</option>`;
        element.disabled = true;
    }
}

// =============================================
// Form Logic
// =============================================
async function loadPersonData() {
    const loading = document.getElementById('loading-state');
    loading.style.display = 'flex';

    try {
        const response = await API.public.getByCode(refCode);

        if (response.exists) {
            personExists = true;
            populateForm(response.data);
            document.getElementById('form-subtitle').textContent =
                'Lütfen adres bilgilerinizi kontrol edin ve gerekirse güncelleyin.';
        }

        document.getElementById('ref-code-value').textContent = refCode.toUpperCase();
        document.getElementById('ref-code-display').style.display = 'block';

        showForm();
    } catch (error) {
        console.error('Error loading person:', error);
        showForm();
    } finally {
        loading.style.display = 'none';
    }
}

async function populateForm(data) {
    console.log('=== POPULATE FORM START ===');

    const setValue = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setValue('firstName', data.firstName);
    setValue('lastName', data.lastName);

    // Set phone - remove + prefix if exists
    if (data.phone) {
        const phoneField = document.getElementById('phone');
        let cleanPhone = data.phone.replace(/[^0-9]/g, '');
        if (phoneInput && phoneField) {
            phoneField.value = cleanPhone;
            // Trigger input event to auto-detect country
            phoneField.dispatchEvent(new Event('input'));
        } else {
            setValue('phone', cleanPhone);
        }
    }

    setValue('email', data.email);
    setValue('street', data.street);
    setValue('buildingNo', data.buildingNo);
    setValue('apartmentNo', data.apartmentNo);
    setValue('postalCode', data.postalCode);
    setValue('fullAddress', data.fullAddress);

    // Otomatik Doldurma Mantığı
    if (data.province) {
        await populateFromStructuredData(data);
    } else if (data.fullAddress) {
        await parseAddressFromText(data.fullAddress);
    }
}

// Mevcut yapısal veriyi kullanarak doldurma
async function populateFromStructuredData(data) {
    const dbPro = normalize(data.province);
    const dbDist = normalize(data.district);
    const dbNeigh = normalize(data.neighborhood);

    const provinceSelect = document.getElementById('province');
    let foundProvince = false;

    // İl Seçimi
    for (const opt of provinceSelect.options) {
        if (normalize(opt.value) === dbPro) {
            opt.selected = true;
            selectedProvince = { id: opt.dataset.id, name: opt.value };
            foundProvince = true;
            break;
        }
    }

    if (foundProvince && data.district) {
        try {
            // İlçe Yükle
            const districts = await API.address.getDistricts(selectedProvince.id);
            const districtSelect = document.getElementById('district');

            districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
            districts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.name;
                opt.textContent = d.name;
                opt.dataset.id = d.id;
                districtSelect.appendChild(opt);
            });
            districtSelect.disabled = false;

            // İlçe Seçimi
            let foundDistrict = false;
            for (const opt of districtSelect.options) {
                if (normalize(opt.value) === dbDist) {
                    opt.selected = true;
                    selectedDistrict = { id: opt.dataset.id, name: opt.value };
                    foundDistrict = true;
                    break;
                }
            }

            if (foundDistrict && data.neighborhood) {
                // Mahalle Yükle
                const neighborhoods = await API.address.getNeighborhoods(selectedProvince.id, selectedDistrict.id);
                const neighborhoodSelect = document.getElementById('neighborhood');

                neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';
                neighborhoods.forEach(n => {
                    const opt = document.createElement('option');
                    opt.value = n.name;
                    opt.textContent = n.name;
                    opt.dataset.id = n.id;
                    neighborhoodSelect.appendChild(opt);
                });
                neighborhoodSelect.disabled = false;

                // Mahalle Seçimi
                for (const opt of neighborhoodSelect.options) {
                    if (normalize(opt.value) === dbNeigh) {
                        opt.selected = true;
                        selectedNeighborhood = { id: opt.dataset.id, name: opt.value };
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Error in structured populate:', error);
        }
    }
}

// Tam adres metninden il/ilçe/mahalle ayıklama (Parsers)
async function parseAddressFromText(fullAddress) {
    const text = normalize(fullAddress);
    console.log('Parsing text:', text);

    const provinceSelect = document.getElementById('province');
    let foundProvince = null;

    // 1. İli Bul
    for (const opt of provinceSelect.options) {
        if (!opt.value) continue;
        const pName = normalize(opt.value);
        if (text.includes(pName)) {
            foundProvince = opt;
            break;
        }
    }

    if (foundProvince) {
        foundProvince.selected = true;
        selectedProvince = { id: foundProvince.dataset.id, name: foundProvince.value };

        try {
            // 2. İlçeleri Yükle ve Bul
            const districts = await API.address.getDistricts(selectedProvince.id);
            const districtSelect = document.getElementById('district');

            districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
            districts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.name;
                opt.textContent = d.name;
                opt.dataset.id = d.id;
                districtSelect.appendChild(opt);
            });
            districtSelect.disabled = false;

            let foundDistrict = null;
            for (const opt of districtSelect.options) {
                if (!opt.value) continue;
                const dName = normalize(opt.value);
                if (text.includes(dName)) {
                    foundDistrict = opt;
                    break;
                }
            }

            if (foundDistrict) {
                foundDistrict.selected = true;
                selectedDistrict = { id: foundDistrict.dataset.id, name: foundDistrict.value };

                // 3. Mahalleleri Yükle ve Bul
                const neighborhoods = await API.address.getNeighborhoods(selectedProvince.id, selectedDistrict.id);
                const neighborhoodSelect = document.getElementById('neighborhood');

                neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';
                neighborhoods.forEach(n => {
                    const opt = document.createElement('option');
                    opt.value = n.name;
                    opt.textContent = n.name;
                    opt.dataset.id = n.id;
                    neighborhoodSelect.appendChild(opt);
                });
                neighborhoodSelect.disabled = false;

                let foundNeighborhood = false;
                for (const opt of neighborhoodSelect.options) {
                    if (!opt.value) continue;
                    const nName = normalize(opt.value);
                    if (text.includes(nName)) {
                        opt.selected = true;
                        selectedNeighborhood = { id: opt.dataset.id, name: opt.value };
                        foundNeighborhood = true;
                        break;
                    }
                }

                if (foundNeighborhood) {
                    showToast('Adres bilgileriniz otomatik tespit edildi ve dolduruldu.', 'success');
                } else {
                    showToast('İl ve İlçe tespit edildi, lütfen Mahalleyi seçiniz.', 'info');
                }
            }
        } catch (error) {
            console.error('Error parsing address:', error);
        }
    }
}
function showForm() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('address-form').style.display = 'block';
}

async function handleSubmit(e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();

    if (!firstName || !lastName) {
        showToast('İsim ve soyisim zorunludur', 'error');
        return;
    }

    const neighborhoodSelect = document.getElementById('neighborhood');
    let neighborhoodValue = neighborhoodSelect.value;
    let isManualNeighborhood = false;

    if (neighborhoodValue === 'other') {
        neighborhoodValue = document.getElementById('manualNeighborhood').value.trim();
        isManualNeighborhood = true;

        if (!neighborhoodValue) {
            showToast('Lütfen mahalle adını giriniz', 'error');
            return;
        }
    }

    // Get phone - add + prefix for backend
    let phoneValue = document.getElementById('phone').value.trim();
    if (phoneValue && !phoneValue.startsWith('+')) {
        phoneValue = '+' + phoneValue;
    }

    const data = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        phone: phoneValue,
        email: document.getElementById('email').value.trim(),
        province: document.getElementById('province').value,
        district: document.getElementById('district').value,
        neighborhood: neighborhoodValue,
        isManualNeighborhood: isManualNeighborhood,
        street: document.getElementById('street').value.trim(),
        buildingNo: document.getElementById('buildingNo').value.trim(),
        apartmentNo: document.getElementById('apartmentNo').value.trim(),
        postalCode: document.getElementById('postalCode').value.trim(),
        fullAddress: document.getElementById('fullAddress').value.trim()
    };

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Gönderiliyor...';

    try {
        const response = await API.public.submit(refCode, data);
        showToast(response.message, 'success');
        showSuccessState(response.message);
    } catch (error) {
        showToast(error.message || 'Gönderim sırasında hata oluştu', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Gönder';
    }
}

function showSuccessState(message) {
    document.getElementById('address-form').style.display = 'none';
    document.getElementById('success-message').textContent = message ||
        (personExists
            ? 'Adres güncelleme talebiniz alındı. Onay sonrası güncellenecektir.'
            : 'Kayıt talebiniz alındı. Onay sonrası sisteme eklenecektir.');
    document.getElementById('success-state').style.display = 'block';

    // Dynamic Button Logic
    if (dynamicBtnConfig.text && dynamicBtnConfig.url) {
        const btn = document.getElementById('dynamic-action-btn');
        const container = document.getElementById('dynamic-action-container');
        if (btn && container) {
            btn.textContent = dynamicBtnConfig.text;
            let url = dynamicBtnConfig.url;
            // Add https if missing
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            btn.href = url;
            container.style.display = 'block';

            // Track button click - use sendBeacon so it completes even during navigation
            btn.addEventListener('click', (e) => {
                if (refCode) {
                    navigator.sendBeacon(`${API_BASE_URL}/public/track-click/${refCode}`);
                }
            });
        }
    }
}

// =============================================
// Initialization  
// =============================================
let phoneInput;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize phone input with flag
    const phoneField = document.getElementById('phone');
    if (phoneField && window.intlTelInput) {
        phoneInput = window.intlTelInput(phoneField, {
            initialCountry: "tr",
            separateDialCode: false,
            autoInsertDialCode: false,
            nationalMode: false,
            formatOnDisplay: false,
            preferredCountries: ["tr", "us", "gb", "de", "nl"],
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js"
        });

        // Set initial dial code (90 for Turkey)
        if (!phoneField.value) {
            phoneField.value = '90';
        }

        // Get all countries data for dynamic matching
        const allCountries = window.intlTelInputGlobals.getCountryData();

        // Sort by dial code length (longest first) for better matching
        const sortedCountries = allCountries.sort((a, b) => b.dialCode.length - a.dialCode.length);

        // Only allow digits
        phoneField.addEventListener('input', function (e) {
            // Remove all non-digits
            let value = this.value.replace(/[^0-9]/g, '');
            this.value = value;

            // Auto-detect country from dial code
            if (value.length >= 1) {
                const currentCountry = phoneInput.getSelectedCountryData();

                // Find matching country by dial code
                for (let country of sortedCountries) {
                    if (value.startsWith(country.dialCode)) {
                        // Found a match - change country if different
                        if (currentCountry.iso2 !== country.iso2) {
                            phoneInput.setCountry(country.iso2);
                        }
                        break;
                    }
                }
            }
        });

        // When country changes via flag dropdown, update dial code
        phoneField.addEventListener('countrychange', function () {
            const countryData = phoneInput.getSelectedCountryData();
            const dialCode = countryData.dialCode;

            // If input is empty or only has a dial code, replace with new dial code
            const currentValue = phoneField.value;
            if (!currentValue || /^\d{1,4}$/.test(currentValue)) {
                phoneField.value = dialCode;
            } else {
                // Replace old dial code with new one
                // Find if current value starts with any known dial code
                let replaced = false;
                for (let country of sortedCountries) {
                    if (currentValue.startsWith(country.dialCode) && country.dialCode !== dialCode) {
                        phoneField.value = dialCode + currentValue.substring(country.dialCode.length);
                        replaced = true;
                        break;
                    }
                }
                // If no match found, keep current value
            }
        });
    }

    // Get ref code from URL
    const urlParams = new URLSearchParams(window.location.search);
    refCode = urlParams.get('r');

    // Get dynamic button params
    dynamicBtnConfig.text = urlParams.get('btnName');
    dynamicBtnConfig.url = urlParams.get('btnLink');

    // Setup address selector events
    document.getElementById('province').addEventListener('change', onProvinceChange);
    document.getElementById('district').addEventListener('change', onDistrictChange);
    document.getElementById('neighborhood').addEventListener('change', onNeighborhoodChange);

    // Load provinces
    await loadProvinces();

    // Load person data if ref code exists
    if (refCode) {
        await loadPersonData();
    } else {
        showForm();
    }

    // Setup form submit
    document.getElementById('address-form').addEventListener('submit', handleSubmit);
});
