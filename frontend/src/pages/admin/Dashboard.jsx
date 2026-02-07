import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';

export default function Dashboard() {
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPerson, setEditingPerson] = useState(null);

    // btnName/btnLink for link generation
    const [btnName, setBtnName] = useState('');
    const [btnLink, setBtnLink] = useState('');

    // Address selector state
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [selectedDistrict, setSelectedDistrict] = useState(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        province: '',
        district: '',
        neighborhood: '',
        street: '',
        buildingNo: '',
        apartmentNo: '',
        postalCode: '',
        fullAddress: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPersons();
    }, [page, search, limit]);

    const loadPersons = async () => {
        try {
            setLoading(true);
            const params = { page, search };
            if (limit !== 'all') params.limit = limit;
            const data = await api.persons.getAll(params);
            setPersons(data.persons || []);

            // Calculate totalPages from pagination object or total count
            const total = data.pagination?.total || data.total || 0;
            setTotalCount(total);

            // Get totalPages from response or calculate it
            const pages = data.pagination?.pages || data.totalPages || (limit !== 'all' ? Math.ceil(total / limit) : 1);
            setTotalPages(pages);
        } catch (error) {
            toast.error('Kişiler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bu kişiyi silmek istediğinize emin misiniz?')) return;

        try {
            await api.persons.delete(id);
            toast.success('Kişi silindi');
            loadPersons();
        } catch (error) {
            toast.error('Silme işlemi başarısız');
        }
    };

    const copyLink = (code) => {
        let url = `${window.location.origin}/?r=${code}`;

        if (btnName && btnLink) {
            url += `&btnName=${encodeURIComponent(btnName)}&btnLink=${encodeURIComponent(btnLink)}`;
        }

        navigator.clipboard.writeText(url);
        toast.success('Link kopyalandı!');
    };

    const exportToExcel = async () => {
        try {
            toast.success('Excel hazırlanıyor...');
            const blob = await api.persons.exportExcel({
                hostname: window.location.hostname,
                btnName,
                btnLink
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'kisiler.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast.success('Excel indirildi!');
        } catch (error) {
            toast.error('Excel export sırasında hata oluştu');
        }
    };

    // Load provinces on mount
    useEffect(() => {
        loadProvinces();
    }, []);

    const loadProvinces = async () => {
        try {
            const data = await api.address.getProvinces();
            setProvinces(data);
        } catch (error) {
            console.error('Error loading provinces:', error);
        }
    };

    const loadDistricts = async (provinceId) => {
        try {
            const data = await api.address.getDistricts(provinceId);
            setDistricts(data);
        } catch (error) {
            console.error('Error loading districts:', error);
        }
    };

    const loadNeighborhoods = async (provinceId, districtId) => {
        try {
            const data = await api.address.getNeighborhoods(provinceId, districtId);
            setNeighborhoods(data);
        } catch (error) {
            console.error('Error loading neighborhoods:', error);
        }
    };

    const handleProvinceChange = (e) => {
        const provinceId = e.target.value;
        const province = provinces.find(p => p.id === provinceId);
        setSelectedProvince(province || null);
        setSelectedDistrict(null);
        setDistricts([]);
        setNeighborhoods([]);
        setFormData(prev => ({ ...prev, province: province?.name || '', district: '', neighborhood: '' }));

        if (provinceId) {
            loadDistricts(provinceId);
        }
    };

    const handleDistrictChange = (e) => {
        const districtId = e.target.value;
        const district = districts.find(d => d.id === districtId);
        setSelectedDistrict(district || null);
        setNeighborhoods([]);
        setFormData(prev => ({ ...prev, district: district?.name || '', neighborhood: '' }));

        if (selectedProvince && districtId) {
            loadNeighborhoods(selectedProvince.id, districtId);
        }
    };

    const handleNeighborhoodChange = (e) => {
        const neighborhoodId = e.target.value;
        const neighborhood = neighborhoods.find(n => n.id === neighborhoodId);
        setFormData(prev => ({ ...prev, neighborhood: neighborhood?.name || '' }));
    };

    const openAddModal = async (person = null) => {
        setSelectedProvince(null);
        setSelectedDistrict(null);
        setDistricts([]);
        setNeighborhoods([]);

        if (person) {
            setEditingPerson(person);
            setFormData({
                firstName: person.firstName || '',
                lastName: person.lastName || '',
                email: person.email || '',
                phone: person.phone || '',
                province: person.province || '',
                district: person.district || '',
                neighborhood: person.neighborhood || '',
                street: person.street || '',
                buildingNo: person.buildingNo || '',
                apartmentNo: person.apartmentNo || '',
                postalCode: person.postalCode || '',
                fullAddress: person.fullAddress || ''
            });

            // Load address selects if editing
            if (person.province) {
                const province = provinces.find(p => p.name === person.province);
                if (province) {
                    setSelectedProvince(province);
                    const distData = await api.address.getDistricts(province.id);
                    setDistricts(distData);

                    if (person.district) {
                        const district = distData.find(d => d.name === person.district);
                        if (district) {
                            setSelectedDistrict(district);
                            const neighData = await api.address.getNeighborhoods(province.id, district.id);
                            setNeighborhoods(neighData);
                        }
                    }
                }
            }
        } else {
            setEditingPerson(null);
            setFormData({
                firstName: '', lastName: '', email: '', phone: '',
                province: '', district: '', neighborhood: '',
                street: '', buildingNo: '', apartmentNo: '',
                postalCode: '', fullAddress: ''
            });
        }
        setShowAddModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName) {
            toast.error('İsim ve soyisim zorunludur');
            return;
        }

        const payload = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            email: formData.email,
            province: formData.province,
            district: formData.district,
            neighborhood: formData.neighborhood,
            street: formData.street,
            buildingNo: formData.buildingNo,
            apartmentNo: formData.apartmentNo,
            postalCode: formData.postalCode,
            fullAddress: formData.fullAddress
        };

        try {
            setSaving(true);
            if (editingPerson) {
                await api.persons.update(editingPerson._id, payload);
                toast.success('Kişi güncellendi');
            } else {
                await api.persons.create(payload);
                toast.success('Kişi eklendi');
            }
            setShowAddModal(false);
            loadPersons();
        } catch (error) {
            toast.error(error.message || 'Kaydetme başarısız');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="container page">
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Kişiler {totalCount > 0 && <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>({totalCount})</span>}</h2>
                        <div className="flex gap-2 flex-wrap" style={{ alignItems: 'center' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: '150px' }}
                            />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Btn Name"
                                value={btnName}
                                onChange={(e) => setBtnName(e.target.value)}
                                style={{ width: '100px' }}
                            />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Btn Link"
                                value={btnLink}
                                onChange={(e) => setBtnLink(e.target.value)}
                                style={{ width: '120px' }}
                            />
                            <button className="btn btn-secondary" onClick={exportToExcel}>
                                📊 Excel
                            </button>
                            <button className="btn btn-primary" onClick={() => openAddModal()}>
                                + Yeni Kişi
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : persons.length === 0 ? (
                        <div className="empty-state">
                            <p>Henüz kişi bulunmuyor</p>
                            <button className="btn btn-primary mt-3" onClick={() => openAddModal()}>
                                + Yeni Kişi Ekle
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Kod</th>
                                            <th>İsim</th>
                                            <th>Email</th>
                                            <th>Telefon</th>
                                            <th>İl/İlçe</th>
                                            <th>İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {persons.map((person) => (
                                            <tr key={person._id}>
                                                <td>
                                                    <span
                                                        className="code-badge"
                                                        onClick={() => copyLink(person.uniqueCode)}
                                                        style={{ cursor: 'pointer' }}
                                                        title="Link kopyala"
                                                    >
                                                        {person.uniqueCode}
                                                    </span>
                                                </td>
                                                <td><strong>{person.firstName} {person.lastName}</strong></td>
                                                <td>{person.email || '-'}</td>
                                                <td>{person.phone || '-'}</td>
                                                <td>{person.province ? `${person.province}/${person.district || ''}` : '-'}</td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => openAddModal(person)}
                                                        >
                                                            Düzenle
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => {
                                                                setSelectedPerson(person);
                                                                setShowModal(true);
                                                            }}
                                                        >
                                                            Detay
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDelete(person._id)}
                                                        >
                                                            Sil
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination */}
                            {persons.length > 0 && (
                                <div className="flex justify-between items-center mt-4" style={{ padding: '0.5rem 0', borderTop: '1px solid #eee' }}>
                                    {/* Sol: Limit seçici */}
                                    <div className="flex gap-2 items-center">
                                        <span style={{ fontSize: '0.9rem', color: '#666' }}>Sayfa başına:</span>
                                        <select
                                            className="form-input"
                                            value={limit}
                                            onChange={(e) => {
                                                const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
                                                setLimit(val);
                                                setPage(1);
                                            }}
                                            style={{ width: 'auto', padding: '0.4rem 0.6rem' }}
                                        >
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={500}>500</option>
                                            <option value={1000}>1000</option>
                                            <option value="all">Tümü</option>
                                        </select>
                                    </div>

                                    {/* Orta: Sayfa geçişleri */}
                                    {totalPages > 1 && (
                                        <div className="flex gap-2 items-center">
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                            >
                                                Önceki
                                            </button>
                                            <span style={{ fontSize: '0.9rem' }}>Sayfa {page} / {totalPages}</span>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages}
                                            >
                                                Sonraki
                                            </button>
                                        </div>
                                    )}

                                    {/* Sağ: Toplam kayıt */}
                                    <span style={{ fontSize: '0.9rem', color: '#666' }}>
                                        Toplam: {totalCount} kayıt
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Detail Modal */}
                {showModal && selectedPerson && (
                    <div className="modal">
                        <div className="modal-backdrop" onClick={() => setShowModal(false)}></div>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3>{selectedPerson.firstName} {selectedPerson.lastName}</h3>
                                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                            </div>
                            <div>
                                <div className="data-item">
                                    <span className="data-item-label">Email</span>
                                    <span>{selectedPerson.email || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">Telefon</span>
                                    <span>{selectedPerson.phone || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">İl</span>
                                    <span>{selectedPerson.province || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">İlçe</span>
                                    <span>{selectedPerson.district || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">Mahalle</span>
                                    <span>{selectedPerson.neighborhood || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">Sokak</span>
                                    <span>{selectedPerson.street || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">Bina/Daire</span>
                                    <span>{selectedPerson.buildingNo || '-'} / {selectedPerson.apartmentNo || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">Tam Adres</span>
                                    <span>{selectedPerson.fullAddress || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">Ref Kodu</span>
                                    <span>{selectedPerson.uniqueCode}</span>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add/Edit Modal */}
                {showAddModal && (
                    <div className="modal">
                        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}></div>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3>{editingPerson ? 'Kişi Düzenle' : 'Yeni Kişi Ekle'}</h3>
                                <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">İsim *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Soyisim *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Telefon</label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.95rem', color: '#666' }}>Adres Bilgileri</h4>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">İl</label>
                                        <select
                                            className="form-input"
                                            value={selectedProvince?.id || ''}
                                            onChange={handleProvinceChange}
                                        >
                                            <option value="">İl Seçin</option>
                                            {provinces.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">İlçe</label>
                                        <select
                                            className="form-input"
                                            value={selectedDistrict?.id || ''}
                                            onChange={handleDistrictChange}
                                            disabled={!selectedProvince}
                                        >
                                            <option value="">İlçe Seçin</option>
                                            {districts.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Mahalle</label>
                                        <select
                                            className="form-input"
                                            value={neighborhoods.find(n => n.name === formData.neighborhood)?.id || ''}
                                            onChange={handleNeighborhoodChange}
                                            disabled={!selectedDistrict}
                                        >
                                            <option value="">Mahalle Seçin</option>
                                            {neighborhoods.map(n => (
                                                <option key={n.id} value={n.id}>{n.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Sokak</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.street}
                                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group" style={{ maxWidth: '100px' }}>
                                        <label className="form-label">Bina No</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.buildingNo}
                                            onChange={(e) => setFormData({ ...formData, buildingNo: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group" style={{ maxWidth: '100px' }}>
                                        <label className="form-label">Daire No</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.apartmentNo}
                                            onChange={(e) => setFormData({ ...formData, apartmentNo: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group" style={{ maxWidth: '120px' }}>
                                        <label className="form-label">Posta Kodu</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.postalCode}
                                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tam Adres</label>
                                    <textarea
                                        className="form-input"
                                        rows="2"
                                        value={formData.fullAddress}
                                        onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                        İptal
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
