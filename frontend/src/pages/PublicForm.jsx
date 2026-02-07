import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function PublicForm() {
    const [searchParams] = useSearchParams();
    // Support both 'r' and 'code' parameters (eski frontend 'r' kullanıyor)
    const code = searchParams.get('r') || searchParams.get('code');
    const btnName = searchParams.get('btnName');
    const btnLink = searchParams.get('btnLink');

    const [loading, setLoading] = useState(true);
    const [personExists, setPersonExists] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '90', // Default Türkiye ülke kodu
        email: '',
        province: '',
        district: '',
        neighborhood: '',
        manualNeighborhood: '',
        isManualNeighborhood: false,
        street: '',
        buildingNo: '',
        apartmentNo: '',
        postalCode: '',
        fullAddress: '',
        notificationConsent: true
    });

    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]);

    // For auto-populating address selectors
    const [selectedProvinceId, setSelectedProvinceId] = useState('');
    const [selectedDistrictId, setSelectedDistrictId] = useState('');

    // Normalize helper for Turkish text comparison
    const normalize = (str) => str ? str.toLocaleLowerCase('tr').replace(/İ/g, 'i').replace(/I/g, 'ı').trim() : '';

    useEffect(() => {
        loadProvinces();
    }, []);

    useEffect(() => {
        if (code && provinces.length > 0) {
            loadPerson();
        } else if (!code) {
            setLoading(false);
        }
    }, [code, provinces]);

    const loadPerson = async () => {
        try {
            const data = await api.public.getByCode(code);
            if (data.exists && data.data) {
                setPersonExists(true);
                await populateForm(data.data);
            }
        } catch (error) {
            console.error('Error loading person:', error);
        } finally {
            setLoading(false);
        }
    };

    const populateForm = async (data) => {
        // Set basic fields
        setFormData(prev => ({
            ...prev,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone ? data.phone.replace(/[^0-9]/g, '') : '90',
            email: data.email || '',
            street: data.street || '',
            buildingNo: data.buildingNo || '',
            apartmentNo: data.apartmentNo || '',
            postalCode: data.postalCode || '',
            fullAddress: data.fullAddress || ''
        }));

        // Auto-populate address selectors
        if (data.province) {
            const normalizedProvince = normalize(data.province);
            const matchedProvince = provinces.find(p => normalize(p.name) === normalizedProvince);

            if (matchedProvince) {
                setSelectedProvinceId(matchedProvince.id);
                setFormData(prev => ({ ...prev, province: matchedProvince.name }));

                // Load districts
                try {
                    const districtData = await api.address.getDistricts(matchedProvince.id);
                    const loadedDistricts = districtData.districts || districtData || [];
                    setDistricts(loadedDistricts);

                    if (data.district) {
                        const normalizedDistrict = normalize(data.district);
                        const matchedDistrict = loadedDistricts.find(d => normalize(d.name) === normalizedDistrict);

                        if (matchedDistrict) {
                            setSelectedDistrictId(matchedDistrict.id);
                            setFormData(prev => ({ ...prev, district: matchedDistrict.name }));

                            // Load neighborhoods
                            try {
                                const neighborhoodData = await api.address.getNeighborhoods(matchedProvince.id, matchedDistrict.id);
                                const loadedNeighborhoods = neighborhoodData.neighborhoods || neighborhoodData || [];
                                setNeighborhoods(loadedNeighborhoods);

                                if (data.neighborhood) {
                                    const normalizedNeighborhood = normalize(data.neighborhood);
                                    const matchedNeighborhood = loadedNeighborhoods.find(n => normalize(n.name) === normalizedNeighborhood);

                                    if (matchedNeighborhood) {
                                        setFormData(prev => ({ ...prev, neighborhood: matchedNeighborhood.name }));
                                    }
                                }
                            } catch (error) {
                                console.error('Error loading neighborhoods:', error);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error loading districts:', error);
                }
            }
        }
    };

    const loadProvinces = async () => {
        try {
            const data = await api.address.getProvinces();
            setProvinces(data.provinces || data || []);
        } catch (error) {
            console.error('Error loading provinces:', error);
        }
    };

    const loadDistricts = async (provinceId) => {
        try {
            const data = await api.address.getDistricts(provinceId);
            setDistricts(data.districts || data || []);
        } catch (error) {
            console.error('Error loading districts:', error);
        }
    };

    const loadNeighborhoods = async (provinceId, districtId) => {
        try {
            const data = await api.address.getNeighborhoods(provinceId, districtId);
            setNeighborhoods(data.neighborhoods || data || []);
        } catch (error) {
            console.error('Error loading neighborhoods:', error);
        }
    };

    const handleProvinceChange = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const provinceId = selectedOption.dataset.id;
        const provinceName = e.target.value;

        setSelectedProvinceId(provinceId);
        setSelectedDistrictId('');
        setFormData(prev => ({
            ...prev,
            province: provinceName,
            district: '',
            neighborhood: '',
            manualNeighborhood: '',
            isManualNeighborhood: false
        }));
        setDistricts([]);
        setNeighborhoods([]);

        if (provinceId) {
            loadDistricts(provinceId);
        }
    };

    const handleDistrictChange = (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const districtId = selectedOption.dataset.id;
        const districtName = e.target.value;

        setSelectedDistrictId(districtId);
        setFormData(prev => ({
            ...prev,
            district: districtName,
            neighborhood: '',
            manualNeighborhood: '',
            isManualNeighborhood: false
        }));
        setNeighborhoods([]);

        if (districtId && selectedProvinceId) {
            loadNeighborhoods(selectedProvinceId, districtId);
        }
    };

    const handleNeighborhoodChange = (e) => {
        const value = e.target.value;
        if (value === 'other') {
            setFormData(prev => ({
                ...prev,
                neighborhood: '',
                isManualNeighborhood: true
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                neighborhood: value,
                manualNeighborhood: '',
                isManualNeighborhood: false
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName) {
            toast.error('İsim ve soyisim zorunludur');
            return;
        }

        // Handle manual neighborhood
        let neighborhoodValue = formData.neighborhood;
        if (formData.isManualNeighborhood) {
            neighborhoodValue = formData.manualNeighborhood;
            if (!neighborhoodValue) {
                toast.error('Lütfen mahalle adını giriniz');
                return;
            }
        }

        // Prepare phone with + prefix
        let phoneValue = formData.phone;
        if (phoneValue && !phoneValue.startsWith('+')) {
            phoneValue = '+' + phoneValue;
        }

        const submitData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: phoneValue,
            email: formData.email,
            province: formData.province,
            district: formData.district,
            neighborhood: neighborhoodValue,
            isManualNeighborhood: formData.isManualNeighborhood,
            street: formData.street,
            buildingNo: formData.buildingNo,
            apartmentNo: formData.apartmentNo,
            postalCode: formData.postalCode,
            fullAddress: formData.fullAddress
        };

        try {
            setSubmitting(true);
            const response = await api.public.submit(code, submitData);
            setSubmitted(true);
            toast.success(response.message || 'Bilgileriniz gönderildi!');
        } catch (error) {
            toast.error(error.message || 'Gönderim başarısız');
        } finally {
            setSubmitting(false);
        }
    };

    // Get dynamic button URL with https prefix
    const getDynamicButtonUrl = () => {
        if (!btnLink) return '#';
        if (btnLink.startsWith('http://') || btnLink.startsWith('https://')) {
            return btnLink;
        }
        return 'https://' + btnLink;
    };

    if (loading) {
        return (
            <div className="public-container">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="public-container">
                <div className="public-header">
                    <h1 className="public-title">📍 Bilgi Doğrulama</h1>
                </div>
                <div className="card public-card text-center">
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Teşekkürler!</h2>
                    <p className="text-muted">
                        {personExists
                            ? 'Adres güncelleme talebiniz alındı. Onay sonrası güncellenecektir.'
                            : 'Kayıt talebiniz alındı. Onay sonrası sisteme eklenecektir.'}
                    </p>

                    {/* Dynamic Action Button */}
                    {btnName && btnLink && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <a
                                href={getDynamicButtonUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-full"
                                style={{
                                    backgroundColor: '#059669',
                                    border: '1px solid #059669',
                                    color: 'white',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 600,
                                    boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.2)'
                                }}
                            >
                                {btnName}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="public-container">
            <div className="public-header">
                <h1 className="public-title">📍 Bilgi Doğrulama</h1>
                <p className="public-subtitle">
                    {personExists
                        ? 'Lütfen adres bilgilerinizi kontrol edin ve gerekirse güncelleyin.'
                        : 'Lütfen bilgilerinizi girin.'}
                </p>
                {code && (
                    <p className="text-muted mt-2">
                        Ref Kodu: <strong>{code.toUpperCase()}</strong>
                    </p>
                )}
            </div>

            <div className="card public-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">İsim *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="İsim"
                                value={formData.firstName}
                                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Soyisim *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Soyisim"
                                value={formData.lastName}
                                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Telefon</label>
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="905XX XXX XX XX"
                                value={formData.phone}
                                onChange={(e) => {
                                    // Only allow digits
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    setFormData(prev => ({ ...prev, phone: value }));
                                }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="ornek@email.com"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                    </div>

                    <hr className="divider" />
                    <h3 className="section-title">Adres Bilgileri</h3>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">İl</label>
                            <select
                                className="form-select"
                                value={formData.province}
                                onChange={handleProvinceChange}
                            >
                                <option value="">İl Seçin</option>
                                {provinces.map((p) => (
                                    <option key={p.id} value={p.name} data-id={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">İlçe</label>
                            <select
                                className="form-select"
                                value={formData.district}
                                onChange={handleDistrictChange}
                                disabled={!formData.province}
                            >
                                <option value="">İlçe Seçin</option>
                                {districts.map((d) => (
                                    <option key={d.id} value={d.name} data-id={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Mahalle</label>
                            <select
                                className="form-select"
                                value={formData.isManualNeighborhood ? 'other' : formData.neighborhood}
                                onChange={handleNeighborhoodChange}
                                disabled={!formData.district}
                            >
                                <option value="">Mahalle Seçin</option>
                                {neighborhoods.map((n) => (
                                    <option key={n.id} value={n.name}>{n.name}</option>
                                ))}
                                <option value="other">Diğer (Listede Yok)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Sokak/Cadde</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.street}
                                onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Manuel mahalle girişi */}
                    {formData.isManualNeighborhood && (
                        <div className="form-group">
                            <label className="form-label">Mahalle Adı *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Mahalle adını yazın..."
                                value={formData.manualNeighborhood}
                                onChange={(e) => setFormData(prev => ({ ...prev, manualNeighborhood: e.target.value }))}
                                required
                            />
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Bina No</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.buildingNo}
                                onChange={(e) => setFormData(prev => ({ ...prev, buildingNo: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Daire No</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.apartmentNo}
                                onChange={(e) => setFormData(prev => ({ ...prev, apartmentNo: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Posta Kodu</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.postalCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tam Adres</label>
                        <textarea
                            className="form-input"
                            rows="2"
                            placeholder="Tam adresinizi yazabilirsiniz..."
                            value={formData.fullAddress}
                            onChange={(e) => setFormData(prev => ({ ...prev, fullAddress: e.target.value }))}
                        />
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0 4px' }}>
                        <input
                            type="checkbox"
                            id="notificationConsent"
                            checked={formData.notificationConsent}
                            onChange={(e) => setFormData(prev => ({ ...prev, notificationConsent: e.target.checked }))}
                            style={{ marginTop: '2px', accentColor: '#4f46e5', cursor: 'pointer' }}
                        />
                        <label htmlFor="notificationConsent" style={{ fontSize: '0.75rem', color: '#9ca3af', lineHeight: '1.35', cursor: 'pointer' }}>
                            Önemli gelişmelerden anında haberdar olmak ve hiçbir detayı kaçırmamak istiyorum.
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={submitting}
                    >
                        {submitting ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                </form>
            </div>

            <div className="text-center" style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>🔒 256-Bit SSL ile Üstün Güvenlik</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', maxWidth: '480px', margin: '0.5rem auto 0', lineHeight: '1.5' }}>
                    Adres ve kişisel verileriniz <strong>ISO 27001</strong> Bilgi Güvenliği Standartlarına uygun olarak şifrelenmekte ve <strong>KVKK</strong> kapsamında güvenle saklanmaktadır.
                </p>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', opacity: 0.9 }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#9ca3af', letterSpacing: '1px', fontWeight: 500, textTransform: 'uppercase' }}>
                    Crafted by <a href="https://mavera.site/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <span style={{ background: 'linear-gradient(135deg, #4f46e5, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800, fontSize: '0.85rem', marginLeft: '2px' }}>MAVERA</span>
                    </a>
                </p>
            </div>
        </div>
    );
}
