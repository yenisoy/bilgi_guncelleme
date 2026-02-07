// Public form page logic
let refCode = null;
let personExists = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Get ref code from URL
    const urlParams = new URLSearchParams(window.location.search);
    refCode = urlParams.get('r');

    // Initialize address selector
    await initAddressSelector();

    // Load person data if ref code exists
    if (refCode) {
        await loadPersonData();
    } else {
        showForm();
    }

    // Setup form submit
    document.getElementById('address-form').addEventListener('submit', handleSubmit);
});

async function loadPersonData() {
    const loading = document.getElementById('loading-state');
    const form = document.getElementById('address-form');

    loading.style.display = 'flex';

    try {
        const response = await API.public.getByCode(refCode);

        if (response.exists) {
            personExists = true;
            populateForm(response.data);
            document.getElementById('form-subtitle').textContent =
                'Lütfen adres bilgilerinizi kontrol edin ve gerekirse güncelleyin.';
        }

        // Show ref code
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

function populateForm(data) {
    document.getElementById('firstName').value = data.firstName || '';
    document.getElementById('lastName').value = data.lastName || '';
    document.getElementById('phone').value = data.phone || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('street').value = data.street || '';
    document.getElementById('buildingNo').value = data.buildingNo || '';
    document.getElementById('apartmentNo').value = data.apartmentNo || '';
    document.getElementById('postalCode').value = data.postalCode || '';
    document.getElementById('fullAddress').value = data.fullAddress || '';
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

    const data = {
        firstName,
        lastName,
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        province: document.getElementById('province').value,
        district: document.getElementById('district').value,
        neighborhood: document.getElementById('neighborhood').value,
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
}

// Address selector initialization
async function initAddressSelector() {
    await loadProvinces();

    document.getElementById('province').addEventListener('change', onProvinceChange);
    document.getElementById('district').addEventListener('change', onDistrictChange);
}

let provinces = [];
let districts = [];
let neighborhoods = [];
let selectedProvince = null;
let selectedDistrict = null;

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
    selectedDistrict = null;

    resetSelect('district');
    resetSelect('neighborhood');

    if (!selectedProvince) return;

    const districtSelect = document.getElementById('district');

    try {
        districts = await API.address.getDistricts(selectedProvince.id);
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

    resetSelect('neighborhood');

    if (!selectedProvince || !selectedDistrict) return;

    const neighborhoodSelect = document.getElementById('neighborhood');

    try {
        neighborhoods = await API.address.getNeighborhoods(selectedProvince.id, selectedDistrict.id);
        neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';
        neighborhoods.forEach(n => {
            const option = document.createElement('option');
            option.value = n.name;
            option.textContent = n.name;
            option.dataset.id = n.id;
            neighborhoodSelect.appendChild(option);
        });
        neighborhoodSelect.disabled = false;
    } catch (error) {
        console.error('Error loading neighborhoods:', error);
    }
}

function resetSelect(id) {
    const select = document.getElementById(id);
    if (!select) return;

    const defaultOptions = {
        district: 'İlçe Seçin',
        neighborhood: 'Mahalle Seçin'
    };
    select.innerHTML = `<option value="">${defaultOptions[id]}</option>`;
    select.disabled = true;
}
