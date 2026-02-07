import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function PublicForm() {
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code');

    const [loading, setLoading] = useState(true);
    const [person, setPerson] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        province: '',
        district: '',
        neighborhood: '',
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

    useEffect(() => {
        if (code) {
            loadPerson();
        } else {
            setLoading(false);
        }
        loadProvinces();
    }, [code]);

    const loadPerson = async () => {
        try {
            const data = await api.public.getByCode(code);
            setPerson(data.person);
            if (data.person) {
                setFormData(prev => ({
                    ...prev,
                    firstName: data.person.firstName || '',
                    lastName: data.person.lastName || '',
                    phone: data.person.phone || '',
                    email: data.person.email || '',
                    province: data.person.address?.province || '',
                    district: data.person.address?.district || '',
                    neighborhood: data.person.address?.neighborhood || '',
                    street: data.person.address?.street || '',
                    buildingNo: data.person.address?.buildingNo || '',
                    apartmentNo: data.person.address?.apartmentNo || '',
                    postalCode: data.person.address?.postalCode || '',
                    fullAddress: data.person.address?.fullAddress || ''
                }));
            }
        } catch (error) {
            toast.error('Kayıt bulunamadı');
        } finally {
            setLoading(false);
        }
    };

    const loadProvinces = async () => {
        try {
            const data = await api.address.getProvinces();
            setProvinces(data.provinces || []);
        } catch (error) { }
    };

    const loadDistricts = async (provinceId) => {
        try {
            const data = await api.address.getDistricts(provinceId);
            setDistricts(data.districts || []);
        } catch (error) { }
    };

    const loadNeighborhoods = async (provinceId, districtId) => {
        try {
            const data = await api.address.getNeighborhoods(provinceId, districtId);
            setNeighborhoods(data.neighborhoods || []);
        } catch (error) { }
    };

    const handleProvinceChange = (e) => {
        const provinceId = e.target.value;
        setFormData(prev => ({ ...prev, province: provinceId, district: '', neighborhood: '' }));
        setDistricts([]);
        setNeighborhoods([]);
        if (provinceId) {
            loadDistricts(provinceId);
        }
    };

    const handleDistrictChange = (e) => {
        const districtId = e.target.value;
        setFormData(prev => ({ ...prev, district: districtId, neighborhood: '' }));
        setNeighborhoods([]);
        if (districtId) {
            loadNeighborhoods(formData.province, districtId);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName) {
            toast.error('İsim ve soyisim zorunludur');
            return;
        }

        try {
            setSubmitting(true);
            await api.public.submit(code, formData);
            setSubmitted(true);
            toast.success('Bilgileriniz gönderildi!');
        } catch (error) {
            toast.error(error.message || 'Gönderim başarısız');
        } finally {
            setSubmitting(false);
        }
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
                    <p className="text-muted">Kayıt talebiniz alındı.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="public-container">
            <div className="public-header">
                <h1 className="public-title">📍 Bilgi Doğrulama</h1>
                <p className="public-subtitle">Lütfen bilgilerinizi girin.</p>
                {code && (
                    <p className="text-muted mt-2">
                        Ref Kodu: <strong>{code}</strong>
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
                                placeholder="05XX XXX XX XX"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
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
                                    <option key={p.id} value={p.id}>{p.name}</option>
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
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Mahalle</label>
                            <select
                                className="form-select"
                                value={formData.neighborhood}
                                onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                                disabled={!formData.district}
                            >
                                <option value="">Mahalle Seçin</option>
                                {neighborhoods.map((n) => (
                                    <option key={n.id} value={n.id}>{n.name}</option>
                                ))}
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
