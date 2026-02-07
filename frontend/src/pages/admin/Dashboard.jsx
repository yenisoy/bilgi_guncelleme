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
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPerson, setEditingPerson] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPersons();
    }, [page, search]);

    const loadPersons = async () => {
        try {
            setLoading(true);
            const data = await api.persons.getAll({ page, search, limit: 20 });
            setPersons(data.persons || []);
            setTotalPages(data.totalPages || 1);
            setTotalCount(data.pagination?.total || data.total || 0);
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
        const url = `${window.location.origin}/?code=${code}`;
        navigator.clipboard.writeText(url);
        toast.success('Link kopyalandı!');
    };

    const exportToExcel = async () => {
        try {
            toast.success('Excel hazırlanıyor...');
            const blob = await api.persons.exportExcel();
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

    const openAddModal = (person = null) => {
        if (person) {
            setEditingPerson(person);
            setFormData({
                firstName: person.firstName || '',
                lastName: person.lastName || '',
                email: person.email || '',
                phone: person.phone || ''
            });
        } else {
            setEditingPerson(null);
            setFormData({ firstName: '', lastName: '', email: '', phone: '' });
        }
        setShowAddModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName) {
            toast.error('İsim ve soyisim zorunludur');
            return;
        }

        try {
            setSaving(true);
            if (editingPerson) {
                await api.persons.update(editingPerson._id, formData);
                toast.success('Kişi güncellendi');
            } else {
                await api.persons.create(formData);
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
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: '200px' }}
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
                                                <td>{person.address?.province ? `${person.address.province}/${person.address.district || ''}` : '-'}</td>
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

                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-4">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        Önceki
                                    </button>
                                    <span>Sayfa {page} / {totalPages}</span>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Sonraki
                                    </button>
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
                                    <span>{selectedPerson.address?.province || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">İlçe</span>
                                    <span>{selectedPerson.address?.district || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">Mahalle</span>
                                    <span>{selectedPerson.address?.neighborhood || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">Sokak</span>
                                    <span>{selectedPerson.address?.street || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">Bina/Daire</span>
                                    <span>{selectedPerson.address?.buildingNo || '-'} / {selectedPerson.address?.apartmentNo || '-'}</span>
                                </div>
                                <div className="data-item">
                                    <span className="data-item-label">Tam Adres</span>
                                    <span>{selectedPerson.address?.fullAddress || '-'}</span>
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
