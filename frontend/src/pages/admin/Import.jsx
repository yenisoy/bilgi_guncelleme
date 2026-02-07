import { useState, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import * as XLSX from 'xlsx';
import './Import.css';

export default function Import() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelection(e.target.files[0]);
        }
    };

    const handleFileSelection = (selectedFile) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];

        if (!validTypes.includes(selectedFile.type) &&
            !selectedFile.name.endsWith('.xlsx') &&
            !selectedFile.name.endsWith('.xls') &&
            !selectedFile.name.endsWith('.csv')) {
            toast.error('Lütfen Excel (.xlsx, .xls) veya CSV (.csv) dosyası seçin');
            return;
        }

        // 5MB limit check
        if (selectedFile.size > 5 * 1024 * 1024) {
            toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
            return;
        }

        setFile(selectedFile);
        setResult(null);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error('Lütfen bir dosya seçin');
            return;
        }

        try {
            setLoading(true);
            const data = await api.persons.import(file);
            setResult(data);

            if (data.errors && data.errors.length > 0) {
                toast.error(`${data.imported || 0} kişi eklendi ama bazı hatalar oluştu`);
            } else {
                toast.success(`${data.imported || 0} kişi başarıyla içe aktarıldı`);
            }

            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            toast.error(error.message || 'İçe aktarma başarısız');
        } finally {
            setLoading(false);
        }
    };

    const downloadSampleExcel = () => {
        // Örnek veri - Backend'in beklediği format
        const sampleData = [
            {
                firstName: 'Ahmet',
                lastName: 'Yılmaz',
                phone: '05321234567',
                email: 'ahmet@email.com',
                province: 'İstanbul',
                district: 'Kadıköy',
                neighborhood: 'Caferağa Mahallesi',
                street: 'Moda Caddesi',
                buildingNo: '15',
                apartmentNo: '4',
                postalCode: '34710',
                fullAddress: 'Moda Cad. No:15 D:4'
            },
            {
                firstName: 'Ayşe',
                lastName: 'Demir',
                phone: '05339876543',
                email: 'ayse@email.com',
                province: 'Ankara',
                district: 'Çankaya',
                neighborhood: 'Kızılay Mahallesi',
                street: 'Atatürk Bulvarı',
                buildingNo: '25',
                apartmentNo: '8',
                postalCode: '06420',
                fullAddress: 'Atatürk Bulv. No:25 D:8'
            }
        ];

        // Worksheet oluştur
        const ws = XLSX.utils.json_to_sheet(sampleData);

        // Workbook oluştur
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kişiler');

        // Excel dosyası olarak indir
        XLSX.writeFile(wb, 'ornek_kisi_listesi.xlsx');

        toast.success('Örnek Excel dosyası indirildi');
    };

    return (
        <>
            <Navbar />
            <div className="container page">
                <div className="card custom-card">
                    <div className="card-header custom-card-header">
                        <h2 className="section-title">Excel ile Kişi Ekle</h2>
                    </div>

                    <div style={{ padding: '2rem' }}>
                        <div className="alert alert-info mb-4" style={{ borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>ℹ️</span>
                                <strong>Excel Dosyası Formatı</strong>
                            </div>
                            <p className="mt-2 mb-2">Excel dosyanız aşağıdaki sütunları içermelidir (en az isim ve soyisim zorunludur):</p>
                            <ul style={{ marginLeft: '1.5rem', listStyleType: 'disc' }}>
                                <li><strong>Zorunlu Alanlar:</strong> firstName (veya isim), lastName (veya soyisim)</li>
                                <li><strong>İsteğe Bağlı Alanlar:</strong> phone, email, province (il), district (ilçe), postalCode</li>
                                <li><strong>Detaylı Adres:</strong>
                                    <ul style={{ listStyleType: 'circle', marginLeft: '1rem' }}>
                                        <li><strong>neighborhood:</strong> mahalle</li>
                                        <li><strong>street:</strong> sokak/cadde</li>
                                        <li><strong>buildingNo:</strong> bina no/kapı no</li>
                                        <li><strong>apartmentNo:</strong> daire no</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>

                        <form onSubmit={handleUpload}>
                            <div className="form-group mb-4">
                                <label className="form-label fw-bold mb-2" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Excel Dosyası Seç</label>
                                <div
                                    className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                                    onClick={() => fileInputRef.current.click()}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    style={{
                                        border: dragActive ? '2px dashed #4f46e5' : '2px dashed #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '2rem',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        backgroundColor: dragActive ? '#eef2ff' : '#f8fafc',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '2rem', color: '#64748b', marginBottom: '1rem' }}>☁️</div>
                                    <p className="text-muted mb-1" style={{ color: '#64748b' }}>Dosyayı sürükleyip bırakın veya seçmek için tıklayın</p>
                                    <span className="text-muted small" style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                                        (.xlsx, .xls, .csv - Maks 5MB)
                                    </span>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="form-input"
                                        accept=".xlsx,.xls,.csv"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                </div>
                                {file && (
                                    <p className="text-center mt-2 fw-bold text-primary" style={{ color: '#4f46e5', fontWeight: 600, marginTop: '0.5rem' }}>
                                        Seçilen dosya: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                    </p>
                                )}
                            </div>

                            {result && (
                                <div className={`alert ${result.errors?.length ? 'alert-warning' : 'alert-success'} mb-4`}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        backgroundColor: result.errors?.length ? '#fef3c7' : '#dcfce7',
                                        color: result.errors?.length ? '#92400e' : '#166534',
                                        border: `1px solid ${result.errors?.length ? '#fcd34d' : '#86efac'}`
                                    }}>
                                    <p><strong>İçe aktarma tamamlandı!</strong></p>
                                    <p>✅ Eklenen: {result.imported || 0}</p>
                                    {result.skipped > 0 && <p>⚠️ Atlanan: {result.skipped}</p>}
                                    {result.errors?.length > 0 && (
                                        <div className="mt-2">
                                            <p><strong>❌ Hatalar:</strong></p>
                                            <ul style={{ marginLeft: '1rem', listStyleType: 'disc' }}>
                                                {result.errors.slice(0, 5).map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                                {result.errors.length > 5 && (
                                                    <li>...ve {result.errors.length - 5} hata daha</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="submit" id="upload-btn" className="btn btn-primary" disabled={!file || loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {loading ? (
                                        <>
                                            <div className="spinner-border spinner-border-sm" role="status" style={{ width: '1rem', height: '1rem', border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                            Yükleniyor...
                                        </>
                                    ) : (
                                        <>
                                            <span>📤</span> Dosyayı Yükle
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <hr className="divider" style={{ margin: '2rem 0', borderTop: '1px solid #e2e8f0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className="section-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Örnek Excel Şablonu</h3>
                            <button onClick={downloadSampleExcel} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>📥</span> Şablonu İndir
                            </button>
                        </div>

                        <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', overflowX: 'auto' }}>
                            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>firstName</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>lastName</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>phone</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>email</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>province</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>district</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>neighborhood</th>
                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>fullAddress</th>
                                    </tr>
                                </thead>
                                <tbody style={{ backgroundColor: 'white' }}>
                                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Ahmet</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Yılmaz</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>05321234567</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>ahmet@email.com</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>İstanbul</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Kadıköy</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Caferağa Mahallesi</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Moda Cad. No:15 D:4</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Ayşe</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Demir</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>05339876543</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>ayse@email.com</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Ankara</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Çankaya</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Kızılay Mahallesi</td>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' }}>Atatürk Bulv. No:25 D:8</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
