import { useEffect, useState } from 'react';
import { fetchDocsApi, toggleDocStatusApi, getPageImageUrl } from '../api/docsApi';

export default function useDocs() {
    const [docs, setDocs] = useState([]);
    const [rightPanel, setRightPanel] = useState(false);
    const [selectedView, setSelectedView] = useState(null);

    useEffect(() => { loadDocs(); }, []);

    const loadDocs = async () => {
        try {
            const data = await fetchDocsApi();
            setDocs(data);
        } catch (e) { console.error("Ошибка загрузки документов", e); }
    };

    const toggleDocStatus = async (id) => {
        setDocs(prev => prev.map(d =>
            d.id === id ? { ...d, status: d.status === 'READY' ? 'DISABLED' : 'READY' } : d
        ));

        try {
            await toggleDocStatusApi(id);
        } catch (e) {
            console.error("Ошибка смены статуса", e);
            loadDocs();
        }
    };

    // УНИВЕРСАЛЬНАЯ ГАЛЕРЕЯ (для PDF/PPTX)
    const openGallery = (docId, pageNumbers, fileName) => {
        if (fileName.toLowerCase().endsWith('.docx')) {
            const doc = docs.find(d => d.id === docId);
            if (doc?.fileUrl) window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(doc.fileUrl)}`, '_blank');
            return;
        }

        const pages = pageNumbers.map(num => ({
            num,
            url: getPageImageUrl(docId, num)
        }));

        setSelectedView({ name: fileName, pages, type: 'gallery', docId });
        setRightPanel(true);
    };

    // ОДИНОЧНЫЙ ПРОСМОТР
    const openPageImage = (docId, pageNum, fileName) => {
        setSelectedView({
            url: getPageImageUrl(docId, pageNum || 1),
            name: `${fileName} (стр. ${pageNum})`,
            docId: docId
        });
        setRightPanel(true);
    };

    return {
        docs, loadDocs, toggleDocStatus,
        rightPanel, setRightPanel, selectedView,
        openGallery, openPageImage,
        closeViewer: () => { setRightPanel(false); setSelectedView(null); }
    };
}