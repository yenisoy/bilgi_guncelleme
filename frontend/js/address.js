// Address selector state
let provinces = [];
let districts = [];
let neighborhoods = [];
let streets = [];

let selectedProvince = null;
let selectedDistrict = null;
let selectedNeighborhood = null;

// Initialize address selector
async function initAddressSelector() {
    await loadProvinces();

    document.getElementById('province').addEventListener('change', onProvinceChange);
    document.getElementById('district').addEventListener('change', onDistrictChange);
    document.getElementById('neighborhood').addEventListener('change', onNeighborhoodChange);
    document.getElementById('street').addEventListener('change', onStreetChange);
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
    selectedDistrict = null;
    selectedNeighborhood = null;

    // Reset dependent selects
    resetSelect('district');
    resetSelect('neighborhood');
    resetSelect('street');

    if (!selectedProvince) return;

    const districtSelect = document.getElementById('district');
    districtSelect.disabled = true;

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
    selectedNeighborhood = null;

    resetSelect('neighborhood');
    resetSelect('street');

    if (!selectedProvince || !selectedDistrict) return;

    const neighborhoodSelect = document.getElementById('neighborhood');
    neighborhoodSelect.disabled = true;

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

async function onNeighborhoodChange(e) {
    const neighborhoodName = e.target.value;
    const neighborhoodOption = e.target.selectedOptions[0];

    selectedNeighborhood = neighborhoodOption?.dataset.id ? { id: neighborhoodOption.dataset.id, name: neighborhoodName } : null;

    resetSelect('street');

    if (!selectedProvince || !selectedDistrict || !selectedNeighborhood) return;

    const streetSelect = document.getElementById('street');
    streetSelect.disabled = true;

    try {
        streets = await API.address.getStreets(selectedProvince.id, selectedDistrict.id, selectedNeighborhood.id);
        streetSelect.innerHTML = '<option value="">Sokak Seçin</option>';
        streets.forEach(s => {
            const option = document.createElement('option');
            option.value = s.name;
            option.textContent = s.name;
            option.dataset.id = s.id;
            streetSelect.appendChild(option);
        });
        streetSelect.disabled = false;
    } catch (error) {
        console.error('Error loading streets:', error);
    }
}

function onStreetChange(e) {
    // Street selected, nothing more to load
}

function resetSelect(id) {
    const select = document.getElementById(id);
    const defaultOptions = {
        district: 'İlçe Seçin',
        neighborhood: 'Mahalle Seçin',
        street: 'Sokak Seçin'
    };
    select.innerHTML = `<option value="">${defaultOptions[id]}</option>`;
    select.disabled = true;
}

// Get form address data
function getAddressData() {
    return {
        province: document.getElementById('province').value,
        district: document.getElementById('district').value,
        neighborhood: document.getElementById('neighborhood').value,
        street: document.getElementById('street').value,
        buildingNo: document.getElementById('buildingNo').value,
        apartmentNo: document.getElementById('apartmentNo').value,
        postalCode: document.getElementById('postalCode').value,
        fullAddress: document.getElementById('fullAddress').value
    };
}

// Set form address data
function setAddressData(data) {
    document.getElementById('buildingNo').value = data.buildingNo || '';
    document.getElementById('apartmentNo').value = data.apartmentNo || '';
    document.getElementById('postalCode').value = data.postalCode || '';
    document.getElementById('fullAddress').value = data.fullAddress || '';

    // Note: For province/district/neighborhood/street, we need to handle them separately
    // as they require cascading API calls
}
