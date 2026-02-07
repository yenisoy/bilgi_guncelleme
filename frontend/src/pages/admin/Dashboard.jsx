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
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        loadPersons();
    }, [page, search]);

    const loadPersons = async () => {
        try {
            setLoading(true);
            const data = await api.persons.getAll({ page, search, limit: 20 });
            setPersons(data.persons || []);
            setTotalPages(data.totalPages || 1);
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

    return (
        <>
            <Navbar />
            <div className="container page">
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Kişiler</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: '200px' }}
                            />
                            <Link to="/admin/import" className="btn btn-primary">
                                + Excel Yükle
                            </Link>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : persons.length === 0 ? (
                        <div className="empty-state">
                            <p>Henüz kişi bulunmuyor</p>
                            <Link to="/admin/import" className="btn btn-primary mt-3">
                                Excel Yükle
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>İsim</th>
                                            <th>Email</th>
                                            <th>Telefon</th>
                                            <th>Durum</th>
                                            <th>İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {persons.map((person) => (
                                            <tr key={person._id}>
                                                <td>{person.firstName} {person.lastName}</td>
                                                <td>{person.email || '-'}</td>
                                                <td>{person.phone || '-'}</td>
                                                <td>
                                                    <span className={`badge badge-${person.status || 'pending'}`}>
                                                        {person.status === 'approved' ? 'Onaylı' :
                                                            person.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => copyLink(person.uniqueCode)}
                                                        >
                                                            Link
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
            </div>
        </>
    );
}
