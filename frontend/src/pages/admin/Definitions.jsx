import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';

export default function Definitions() {
    const [activeTab, setActiveTab] = useState('province'); // province, district, neighborhood
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]);

    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');

    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadProvinces();
    }, []);

    useEffect(() => {
        if (selectedProvince) {
            loadDistricts(selectedProvince);
            setSelectedDistrict('');
            setNeighborhoods([]);
        }
    }, [selectedProvince]);

    useEffect(() => {
        if (selectedProvince && selectedDistrict) {
            loadNeighborhoods(selectedProvince, selectedDistrict);
        }
    }, [selectedDistrict]);

    const loadProvinces = async () => {
        try {
            setLoading(true);
            const data = await api.address.getProvinces();
            setProvinces(data.provinces || data || []);
        } catch (error) {
            toast.error('İller yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const loadDistricts = async (provinceId) => {
        try {
            setLoading(true);
            const data = await api.address.getDistricts(provinceId);
            setDistricts(data.districts || data || []);
        } catch (error) {
            toast.error('İlçeler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const loadNeighborhoods = async (provinceId, districtId) => {
        try {
            setLoading(true);
            const data = await api.address.getNeighborhoods(provinceId, districtId);
            setNeighborhoods(data.neighborhoods || data || []);
        } catch (error) {
            toast.error('Mahalleler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const syncAddresses = async () => {
        if (!window.confirm('Tüm Türkiye adres verisini (İl, İlçe, Mahalle) güncellemek istiyor musunuz?\n\nBu işlem 5-10 dakika sürebilir ve arka planda çalışır.')) {
            return;
        }

        try {
            setSyncing(true);
            toast.success('Adres senkronizasyonu başlatılıyor...');
            const data = await api.address.sync();
            toast.success(data.message || 'Senkronizasyon başlatıldı');
            setTimeout(() => loadProvinces(), 2000);
        } catch (error) {
            toast.error(error.message || 'Senkronizasyon başlatılamadı');
        } finally {
            setSyncing(false);
        }
    };

    const filterData = (data) => {
        if (!search) return data;
        return data.filter(item =>
            item.name?.toLowerCase().includes(search.toLowerCase())
        );
    };

    const getSelectedProvinceName = () => {
        const province = provinces.find(p => p.id === selectedProvince);
        return province?.name || '';
    };

    const getSelectedDistrictName = () => {
        const district = districts.find(d => d.id === selectedDistrict);
        return district?.name || '';
    };

    return (
        <>
            <Navbar />
            <div className="container page">
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Adres Tanımları</h2>
                        <button
                            className="btn btn-primary"
                            onClick={syncAddresses}
                            disabled={syncing}
                        >
                            {syncing ? '🔄 Senkronize ediliyor...' : '🔄 Adresleri Güncelle'}
                        </button>
                    </div>

                    {provinces.length === 0 && !loading && (
                        <div className="alert alert-warning mb-4">
                            <p><strong>Adres verisi bulunamadı!</strong></p>
                            <p>İl, ilçe ve mahalle verilerini yüklemek için "Adresleri Güncelle" butonuna tıklayın.</p>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="tabs mb-4">
                        <button
                            className={`tab ${activeTab === 'province' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('province'); setSearch(''); }}
                        >
                            İller ({provinces.length})
                        </button>
                        <button
                            className={`tab ${activeTab === 'district' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('district'); setSearch(''); }}
                        >
                            İlçeler ({districts.length})
                        </button>
                        <button
                            className={`tab ${activeTab === 'neighborhood' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('neighborhood'); setSearch(''); }}
                        >
                            Mahalleler ({neighborhoods.length})
                        </button>
                    </div>

                    {/* Filters based on active tab */}
                    <div className="form-row mb-4">
                        <div className="form-group">
                            <label className="form-label">Ara</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="İsim ile ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {(activeTab === 'district' || activeTab === 'neighborhood') && (
                            <div className="form-group">
                                <label className="form-label">İl Filtresi</label>
                                <select
                                    className="form-select"
                                    value={selectedProvince}
                                    onChange={(e) => setSelectedProvince(e.target.value)}
                                >
                                    <option value="">İl Seçin</option>
                                    {provinces.map((province) => (
                                        <option key={province.id} value={province.id}>
                                            {province.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {activeTab === 'neighborhood' && (
                            <div className="form-group">
                                <label className="form-label">İlçe Filtresi</label>
                                <select
                                    className="form-select"
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    disabled={!selectedProvince}
                                >
                                    <option value="">{selectedProvince ? 'İlçe Seçin' : 'Önce İl Seçin'}</option>
                                    {districts.map((district) => (
                                        <option key={district.id} value={district.id}>
                                            {district.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : (
                        <>
                            {/* Provinces Tab */}
                            {activeTab === 'province' && (
                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>İl Adı</th>
                                                <th>ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filterData(provinces).map((province, index) => (
                                                <tr key={province.id}>
                                                    <td>{index + 1}</td>
                                                    <td><strong>{province.name}</strong></td>
                                                    <td>{province.id}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filterData(provinces).length === 0 && (
                                        <div className="empty-state">
                                            <p>Sonuç bulunamadı</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Districts Tab */}
                            {activeTab === 'district' && (
                                <>
                                    {!selectedProvince ? (
                                        <div className="empty-state">
                                            <p>İlçeleri görmek için bir il seçin</p>
                                        </div>
                                    ) : (
                                        <div className="table-container">
                                            <h4 className="section-title">{getSelectedProvinceName()} İlçeleri</h4>
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>İlçe Adı</th>
                                                        <th>ID</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filterData(districts).map((district, index) => (
                                                        <tr key={district.id}>
                                                            <td>{index + 1}</td>
                                                            <td><strong>{district.name}</strong></td>
                                                            <td>{district.id}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {filterData(districts).length === 0 && (
                                                <div className="empty-state">
                                                    <p>Sonuç bulunamadı</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Neighborhoods Tab */}
                            {activeTab === 'neighborhood' && (
                                <>
                                    {!selectedProvince || !selectedDistrict ? (
                                        <div className="empty-state">
                                            <p>Mahalleleri görmek için il ve ilçe seçin</p>
                                        </div>
                                    ) : (
                                        <div className="table-container">
                                            <h4 className="section-title">
                                                {getSelectedProvinceName()} / {getSelectedDistrictName()} Mahalleleri
                                            </h4>
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Mahalle Adı</th>
                                                        <th>Posta Kodu</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filterData(neighborhoods).map((n, index) => (
                                                        <tr key={n.id || index}>
                                                            <td>{index + 1}</td>
                                                            <td><strong>{n.name}</strong></td>
                                                            <td>{n.postalCode || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {filterData(neighborhoods).length === 0 && (
                                                <div className="empty-state">
                                                    <p>Sonuç bulunamadı</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
