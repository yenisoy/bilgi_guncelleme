import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';

export default function Changes() {
    const [changes, setChanges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    useEffect(() => {
        loadChanges();
    }, [filter]);

    const loadChanges = async () => {
        try {
            setLoading(true);
            const data = await api.changes.getAll(filter);
            setChanges(data.changes || []);
        } catch (error) {
            toast.error('Değişiklikler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id, addToSystem = false) => {
        try {
            await api.changes.approve(id, addToSystem);
            toast.success('Değişiklik onaylandı');
            loadChanges();
        } catch (error) {
            toast.error('Onaylama başarısız');
        }
    };

    const handleReject = async (id) => {
        try {
            await api.changes.reject(id);
            toast.success('Değişiklik reddedildi');
            loadChanges();
        } catch (error) {
            toast.error('Reddetme başarısız');
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <Navbar />
            <div className="container page">
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Değişiklik Talepleri</h2>
                        <div className="flex gap-2">
                            {['pending', 'approved', 'rejected'].map((status) => (
                                <button
                                    key={status}
                                    className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setFilter(status)}
                                >
                                    {status === 'pending' ? 'Bekleyen' :
                                        status === 'approved' ? 'Onaylanan' : 'Reddedilen'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : changes.length === 0 ? (
                        <div className="empty-state">
                            <p>Değişiklik talebi bulunmuyor</p>
                        </div>
                    ) : (
                        changes.map((change) => (
                            <div key={change._id} className="change-item">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <strong>{change.person?.firstName} {change.person?.lastName}</strong>
                                        <span className="text-muted" style={{ marginLeft: '0.5rem' }}>
                                            {formatDate(change.createdAt)}
                                        </span>
                                    </div>
                                    <span className={`badge badge-${change.status}`}>
                                        {change.status === 'pending' ? 'Beklemede' :
                                            change.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                                    </span>
                                </div>

                                <div className="data-diff">
                                    <div className="data-diff-column">
                                        <h4>Eski Bilgiler</h4>
                                        <div className="data-diff-old">
                                            {Object.entries(change.oldData || {}).map(([key, value]) => (
                                                <div key={key} className="data-item">
                                                    <span className="data-item-label">{key}</span>
                                                    <span>{String(value) || '-'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="data-diff-column">
                                        <h4>Yeni Bilgiler</h4>
                                        <div className="data-diff-new">
                                            {Object.entries(change.newData || {}).map(([key, value]) => (
                                                <div key={key} className="data-item">
                                                    <span className="data-item-label">{key}</span>
                                                    <span>{String(value) || '-'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {change.status === 'pending' && (
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            className="btn btn-success"
                                            onClick={() => handleApprove(change._id, true)}
                                        >
                                            Onayla ve Sisteme Ekle
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => handleApprove(change._id, false)}
                                        >
                                            Sadece Onayla
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => handleReject(change._id)}
                                        >
                                            Reddet
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
