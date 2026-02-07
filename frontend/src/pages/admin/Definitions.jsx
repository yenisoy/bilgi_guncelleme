import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';

export default function Definitions() {
    const [provinces, setProvinces] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState('');
    const [districts, setDistricts] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [neighborhoods, setNeighborhoods] = useState([]);
    const [loading, setLoading] = useState(false);

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
            const data = await api.address.getProvinces();
            setProvinces(data.provinces || []);
        } catch (error) {
            toast.error('İller yüklenemedi');
        }
    };

    const loadDistricts = async (provinceId) => {
        try {
            setLoading(true);
            const data = await api.address.getDistricts(provinceId);
            setDistricts(data.districts || []);
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
            setNeighborhoods(data.neighborhoods || []);
        } catch (error) {
            toast.error('Mahalleler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="container page">
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Adres Tanımları</h2>
                    </div>

                    <div className="form-row mb-4">
                        <div className="form-group">
                            <label className="form-label">İl</label>
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

                        <div className="form-group">
                            <label className="form-label">İlçe</label>
                            <select
                                className="form-select"
                                value={selectedDistrict}
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                                disabled={!selectedProvince}
                            >
                                <option value="">İlçe Seçin</option>
                                {districts.map((district) => (
                                    <option key={district.id} value={district.id}>
                                        {district.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : neighborhoods.length > 0 ? (
                        <div>
                            <h4 className="section-title">Mahalleler ({neighborhoods.length})</h4>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Mahalle Adı</th>
                                            <th>Posta Kodu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {neighborhoods.map((n, index) => (
                                            <tr key={n.id || index}>
                                                <td>{index + 1}</td>
                                                <td>{n.name}</td>
                                                <td>{n.postalCode || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : selectedDistrict ? (
                        <div className="empty-state">
                            <p>Bu ilçeye ait mahalle bulunmuyor</p>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>Mahalleleri görmek için il ve ilçe seçin</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
