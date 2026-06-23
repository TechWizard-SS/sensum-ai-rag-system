import {
    FileText, Moon, RefreshCcw, Sun, Trash2, Database, AlertCircle,
    UploadCloud, Globe, HardDrive, Check, Clock, XCircle, Loader2,
    ExternalLink, Presentation, FileCode, FileSignature, CheckSquare, Square,
    BookOpen, X
} from 'lucide-react';
import { uploadDocumentsApi } from '../api/docsApi';
import { useState, useEffect } from 'react';

export default function KnowledgeBaseView({
                                              docs,
                                              fetchDocs,
                                              toggleDocStatus
                                          }) {
    const [storage, setStorage] = useState({
        database: { used: 0, limit: 524288000 },
        storage: { used: 0, limit: 1073741824 }
    });

    // Состояние модалки удаления
    const [deleteModal, setDeleteModal] = useState({ show: false, ids: [] });

    const [urlInput, setUrlInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadQueue, setUploadQueue] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);

    const fetchStorageUsage = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8080/api/docs/usage');
            const data = await res.json();
            setStorage(data);
        } catch (e) { console.error("Ошибка загрузки памяти", e); }
    };

    useEffect(() => {
        fetchDocs();
        fetchStorageUsage();
    }, []);

    // Функция подбора иконки (Книга для URL, корректные размеры)
    const getFileIcon = (name) => {
        const ext = name.toLowerCase().split('.').pop();
        const iconSize = 24;

        if (ext === 'pdf') return <FileText size={iconSize} className="text-red-500/80" />;
        if (ext === 'pptx') return <Presentation size={iconSize} className="text-orange-500/80" />;
        if (ext === 'docx') return <FileSignature size={iconSize} className="text-blue-400" />;

        // Для веб-ссылок используем книгу
        if (name.startsWith('http') || name.toLowerCase().includes('http')) {
            return <BookOpen size={iconSize} className="text-cyan-400" />;
        }
        return <FileText size={iconSize} className="text-gray-500" />;
    };

    // DRAG AND DROP
    const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
    const handleDragLeave = () => { setIsDragOver(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) processFiles(files);
    };

    const processFiles = async (files) => {
        setIsUploading(true);
        setUploadQueue(files.map(f => ({ name: f.name, status: 'waiting' })));
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setUploadQueue(prev => prev.map((item, idx) => i === idx ? { ...item, status: 'loading' } : item));
            try {
                await uploadDocumentsApi([file]);
                setUploadQueue(prev => prev.map((item, idx) => i === idx ? { ...item, status: 'done' } : item));
            } catch (err) {
                setUploadQueue(prev => prev.map((item, idx) => i === idx ? { ...item, status: 'error' } : item));
            }
        }
        await fetchDocs();
        await fetchStorageUsage();
        setTimeout(() => { setUploadQueue([]); setIsUploading(false); }, 3000);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) processFiles(files);
    };

    // ЛОГИКА УДАЛЕНИЯ ЧЕРЕЗ МОДАЛКУ
    const openDeleteModal = (ids) => {
        setDeleteModal({ show: true, ids });
    };

    const executeDelete = async () => {
        try {
            const res = await fetch('http://127.0.0.1:8080/api/docs/batch', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deleteModal.ids)
            });
            if (res.ok) {
                await fetchDocs();
                await fetchStorageUsage();
                setSelectedIds([]);
                setDeleteModal({ show: false, ids: [] });
            }
        } catch (e) { alert("Ошибка при удалении"); }
    };

    // Массовый выбор
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const toggleSelectAll = () => {
        if (selectedIds.length === docs.length) setSelectedIds([]);
        else setSelectedIds(docs.map(d => d.id));
    };

    const handleUrlUpload = async () => {
        if (!urlInput.trim()) return;
        setIsUploading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8080/api/docs/upload-url?url=${encodeURIComponent(urlInput)}`, {
                method: 'POST'
            });
            if (res.ok) { setUrlInput(''); fetchDocs(); fetchStorageUsage(); }
        } catch (e) { alert("Ошибка при парсинге URL"); }
        setIsUploading(false);
    };

    const handleViewFile = (doc) => {
        const cloudUrl = doc.fileUrl; // Публичный URL из Supabase
        const fileName = doc.name.toLowerCase();

        // 1. Если это внешняя ссылка (Хабр и т.д.), открываем как есть
        // Считаем ссылкой всё, что не ведет на Supabase, но начинается с http
        if (cloudUrl && cloudUrl.startsWith('http') && !cloudUrl.includes('supabase.co')) {
            return cloudUrl;
        }

        // 2. Если это файл в облаке Supabase
        if (cloudUrl) {
            // Проверяем, является ли файл офисным
            const isOffice = fileName.endsWith('.docx') ||
                fileName.endsWith('.pptx') ||
                fileName.endsWith('.xlsx');

            if (isOffice) {
                // Пропускаем через прокси Microsoft
                return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(cloudUrl)}`;
            }
            // PDF и картинки открываем напрямую
            return cloudUrl;
        }

        // 3. Фолбек на локальный сервер (если нет ссылки в БД)
        return `http://127.0.0.1:8080/api/docs/${doc.id}/view`;
    };

    const usedDbMB = (storage.database?.used / (1024 * 1024)).toFixed(1) || 0;
    const usedS3MB = (storage.storage?.used / (1024 * 1024)).toFixed(1) || 0;
    const dbPercent = Math.min((storage.database?.used / storage.database?.limit) * 100, 100) || 0;
    const s3Percent = Math.min((storage.storage?.used / storage.storage?.limit) * 100, 100) || 0;

    return (
        <div className="h-full flex-1 overflow-y-auto custom-scrollbar bg-[#0d1117]">
            <div className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-10 animate-in fade-in duration-500">

                {/* ШАПКА */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-gray-800 pb-10">
                    <div className="flex items-center gap-5">
                        <div className="bg-blue-600/20 p-4 rounded-3xl text-blue-500 shadow-lg shadow-blue-500/5">
                            <Database size={40} strokeWidth={1.5} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white tracking-tight">Библиотека</h2>
                            <p className="text-gray-500 text-sm font-medium mt-1 uppercase tracking-widest font-sans">Центр управления данными</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-8 w-full lg:w-auto">
                        <div className="w-full sm:w-48 space-y-2">
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
                                <span>Database</span>
                                <span className="text-blue-400 font-bold">{usedDbMB} / 512 MB</span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${dbPercent}%` }} />
                            </div>
                        </div>
                        <div className="w-full sm:w-48 space-y-2">
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
                                <span>S3 Cloud</span>
                                <span className="text-emerald-400 font-bold">{usedS3MB} / 1024 MB</span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${s3Percent}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ДОБАВЛЕНИЕ ФАЙЛОВ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                    <label
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`group relative flex flex-col items-center justify-center p-8 bg-[#161b22] border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 ${
                            isDragOver ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' : 'border-gray-800 hover:border-blue-500/50 hover:bg-[#1c2128]'
                        }`}
                    >
                        <UploadCloud size={32} className={`${isDragOver ? 'text-blue-400' : 'text-gray-500'} group-hover:text-blue-400 mb-3`} />
                        <span className="text-sm font-bold text-gray-300 text-center">
                            {isDragOver ? 'Отпускайте!' : 'Загрузить PDF, PPTX или DOCX'}
                        </span>
                        <input type="file" multiple className="hidden" onChange={handleFileSelect} accept=".pdf,.pptx,.docx" />
                    </label>

                    <div className="flex flex-col p-8 bg-[#161b22] border border-gray-800 rounded-3xl">
                        <div className="flex items-center gap-2 mb-4 text-gray-400 font-bold text-sm">
                            <Globe size={18} className="text-blue-500" />
                            <span>Парсинг веб-статьи</span>
                        </div>
                        <div className="flex gap-2">
                            <input type="url" placeholder="https://..." value={urlInput}
                                   onChange={(e) => setUrlInput(e.target.value)}
                                   className="flex-1 bg-[#0d1117] border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 text-white" />
                            <button onClick={handleUrlUpload} disabled={isUploading}
                                    className="bg-white text-black px-5 rounded-xl font-bold text-xs hover:bg-gray-200 transition">
                                {isUploading ? <Loader2 className="animate-spin" size={16}/> : 'ПАРСИТЬ'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ОЧЕРЕДЬ ОБРАБОТКИ */}
                {uploadQueue.length > 0 && (
                    <div className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2">
                        <h4 className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-2 tracking-widest">
                            <Clock size={12} className="animate-pulse" /> Очередь обработки
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {uploadQueue.map((item, i) => (
                                <div key={i} className="bg-[#0d1117] p-3 rounded-xl flex items-center justify-between border border-gray-800">
                                    <span className="text-xs text-gray-400 truncate max-w-[150px] font-sans">{item.name}</span>
                                    {item.status === 'loading' && <Loader2 size={14} className="animate-spin text-blue-500" />}
                                    {item.status === 'done' && <Check size={14} className="text-green-500" />}
                                    {item.status === 'error' && <XCircle size={14} className="text-red-500" />}
                                    {item.status === 'waiting' && <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ТАБЛИЦА ДОКУМЕНТОВ */}
                <div className="bg-[#161b22] border border-gray-800 rounded-[32px] overflow-hidden shadow-2xl">
                    <div className="p-4 bg-[#0d1117] border-b border-gray-800 flex justify-between items-center px-7 min-h-[70px]">
                        <div className="flex items-center gap-4">
                            <button onClick={toggleSelectAll} className="text-gray-500 hover:text-white transition">
                                {selectedIds.length === docs.length && docs.length > 0 ? <CheckSquare size={20} className="text-blue-500"/> : <Square size={20}/>}
                            </button>
                            {selectedIds.length > 0 && (
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-in fade-in">
                                   Выбрано: {selectedIds.length}
                               </span>
                            )}
                        </div>
                        {selectedIds.length > 0 && (
                            <button onClick={() => openDeleteModal(selectedIds)} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 rounded-2xl text-[10px] font-black hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5">
                                <Trash2 size={14}/> УДАЛИТЬ ВЫБРАННЫЕ
                            </button>
                        )}
                    </div>

                    <table className="w-full text-sm text-left font-sans">
                        <thead className="bg-[#0d1117] text-gray-500 text-[10px] uppercase tracking-[0.3em] font-black">
                        <tr>
                            <th className="p-7">Документ</th>
                            <th className="p-7 text-center">Контекст</th>
                            <th className="p-7 text-right">Действия</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                        {docs.length === 0 ? (
                            <tr><td colSpan="3" className="p-24 text-center opacity-10 italic">Архив пуст</td></tr>
                        ) : (
                            docs.map(d => (
                                <tr key={d.id} className={`group transition-all ${d.status === 'DISABLED' ? 'opacity-40' : 'hover:bg-[#1c2128]'}`}>
                                    <td className="p-7">
                                        <div className="flex items-center gap-5">
                                            <button onClick={() => toggleSelect(d.id)} className="text-gray-700 hover:text-blue-500 transition">
                                                {selectedIds.includes(d.id) ? <CheckSquare size={18} className="text-blue-500"/> : <Square size={18}/>}
                                            </button>
                                            {getFileIcon(d.name)}
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-100 font-bold text-base line-clamp-1 max-w-[300px]">{d.name}</span>
                                                    {d.draft && <span className="bg-orange-500/10 text-orange-500 text-[9px] font-black px-2 py-0.5 rounded border border-orange-500/20">PROJECT</span>}
                                                </div>
                                                <span className="text-[10px] text-gray-600 mt-1 font-medium">ID: {d.id} • {new Date(d.uploadDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-7 text-center">
                                        <button onClick={() => toggleDocStatus(d.id)}
                                                className={`inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl text-[11px] font-black border transition-all ${
                                                    d.status === 'READY'
                                                        ? 'bg-green-500/10 text-green-500 border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                                                        : 'bg-gray-800/40 text-gray-500 border-gray-700'
                                                }`}>
                                            {d.status === 'READY' ? <Sun size={14} className="animate-pulse-slow"/> : <Moon size={14}/>}
                                            {d.status === 'READY' ? 'ACTIVE' : 'SLEEPING'}
                                        </button>
                                    </td>
                                    <td className="p-7 text-right">
                                        <div
                                            className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={handleViewFile(d)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-3 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
                                            >
                                                <ExternalLink size={18}/>
                                            </a>
                                            <button onClick={() => openDeleteModal([d.id])}
                                                    className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-[#161b22] border border-blue-500/10 p-7 rounded-[32px] flex gap-6 items-start shadow-xl">
                    <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500">
                        <AlertCircle size={24} />
                    </div>
                    <div className="space-y-1">
                        <h5 className="text-sm font-black text-white uppercase tracking-wider">Подсказка аналитику</h5>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            <span className="text-green-500 font-black">ACTIVE</span> — документ проиндексирован и участвует в поиске.
                            <span className="text-gray-400 font-black ml-2">SLEEPING</span> — файл хранится в облаке, но ИИ его игнорирует.
                        </p>
                    </div>
                </div>
            </div>

            {/* МОДАЛЬНОЕ ОКНО УДАЛЕНИЯ */}
            {deleteModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#161b22] border border-gray-800 w-full max-w-sm rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-500/10 p-5 rounded-full text-red-500 mb-8 shadow-inner">
                                <Trash2 size={40} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3">Удалить данные?</h3>
                            <p className="text-sm text-gray-500 leading-relaxed mb-10">
                                Вы собираетесь стереть <b>{deleteModal.ids.length}</b> объект(ов).
                                Это действие удалит векторы из памяти и файлы из облака навсегда.
                            </p>
                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setDeleteModal({ show: false, ids: [] })}
                                    className="flex-1 px-6 py-4 bg-[#0d1117] hover:bg-gray-800 text-gray-400 rounded-[22px] font-bold text-xs transition-all border border-gray-800"
                                >
                                    ОТМЕНА
                                </button>
                                <button
                                    onClick={executeDelete}
                                    className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-500 text-white rounded-[22px] font-black text-xs transition-all shadow-xl shadow-red-600/20 uppercase tracking-widest"
                                >
                                    УДАЛИТЬ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}