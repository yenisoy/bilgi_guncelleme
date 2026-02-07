import { useState, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';

export default function Import() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const validTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/csv'
            ];
            if (!validTypes.includes(selectedFile.type) &&
                !selectedFile.name.endsWith('.xlsx') &&
                !selectedFile.name.endsWith('.xls') &&
                !selectedFile.name.endsWith('.csv')) {
                toast.error('Lütfen Excel veya CSV dosyası seçin');
                return;
            }
            setFile(selectedFile);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error('Lütfen bir dosya seçin');
            return;
        }

        try {
            setLoading(true);
            const data = await api.persons.import(file);
            setResult(data);
            toast.success(`${data.imported || 0} kişi başarıyla içe aktarıldı`);
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
        // CSV formatında örnek dosya oluştur
        const headers = ['firstName', 'lastName', 'email', 'phone'];
        const sampleData = [
            ['Ahmet', 'Yılmaz', 'ahmet@email.com', '05321234567'],
            ['Mehmet', 'Demir', 'mehmet@email.com', '05339876543'],
            ['Ayşe', 'Kaya', 'ayse@email.com', '05551112233']
        ];

        const csvContent = [
            headers.join(','),
            ...sampleData.map(row => row.join(','))
        ].join('\n');

        // BOM ekle (Excel'de Türkçe karakterler için)
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'ornek_kisi_listesi.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Örnek dosya indirildi');
    };

    return (
        <>
            <Navbar />
            <div className="container page">
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Excel İçe Aktar</h2>
                    </div>

                    <div className="mb-4">
                        <p className="text-muted mb-3">
                            Excel veya CSV dosyası yükleyerek toplu kişi ekleyebilirsiniz.
                            Dosyanızda şu sütunlar olmalıdır: <strong>firstName, lastName, email, phone</strong>
                        </p>

                        <div className="flex gap-3 items-center">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                className="form-input"
                                style={{ maxWidth: '400px' }}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleUpload}
                                disabled={!file || loading}
                            >
                                {loading ? 'Yükleniyor...' : 'Yükle'}
                            </button>
                        </div>

                        {file && (
                            <p className="mt-2 text-muted">
                                Seçilen dosya: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                            </p>
                        )}
                    </div>

                    {result && (
                        <div className={`alert ${result.errors?.length ? 'alert-warning' : 'alert-success'}`}>
                            <p><strong>İçe aktarma tamamlandı!</strong></p>
                            <p>Eklenen: {result.imported || 0}</p>
                            {result.skipped > 0 && <p>Atlanan: {result.skipped}</p>}
                            {result.errors?.length > 0 && (
                                <div className="mt-2">
                                    <p><strong>Hatalar:</strong></p>
                                    <ul style={{ marginLeft: '1rem' }}>
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

                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="section-title" style={{ margin: 0 }}>Örnek Dosya Formatı</h4>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={downloadSampleExcel}
                            >
                                📥 Örnek CSV İndir
                            </button>
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>firstName</th>
                                        <th>lastName</th>
                                        <th>email</th>
                                        <th>phone</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Ahmet</td>
                                        <td>Yılmaz</td>
                                        <td>ahmet@email.com</td>
                                        <td>05321234567</td>
                                    </tr>
                                    <tr>
                                        <td>Mehmet</td>
                                        <td>Demir</td>
                                        <td>mehmet@email.com</td>
                                        <td>05339876543</td>
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

