const API_BASE = "/api";
export async function fetchDocsApi() {
    const res = await fetch(`${API_BASE}/docs/all`);
    if (!res.ok) throw new Error("Не удалось загрузить список документов");
    return await res.json();
}

export async function toggleDocStatusApi(id) {
    const res = await fetch(`${API_BASE}/docs/${id}/toggle`, {
        method: 'PATCH'
    });
    if (!res.ok) throw new Error("Не удалось изменить статус документа");
    return res;
}

export async function uploadDocumentsApi(files, signal) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    const res = await fetch(`${API_BASE}/docs/upload-multiple`, {
        method: 'POST',
        body: formData,
        signal: signal
    });
    return await res.json();
}

export function getPageImageUrl(docId, pageNum) {
    return `${API_BASE}/docs/${docId}/page/${pageNum}`;
}

export async function deleteDocumentApi(id) {
    return await fetch(`${API_BASE}/docs/${id}`, { method: 'DELETE' });
}

export async function fetchStorageUsageApi() {
    const res = await fetch(`${API_BASE}/docs/usage`);
    if (!res.ok) throw new Error("Не удалось загрузить данные о памяти");
    return await res.json();
}

/**
 * ПРОВЕРЕНО: добавлен аргумент signal
 */
export async function parseTempFileApi(file, signal) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/docs/parse-temp`, {
        method: 'POST',
        body: formData,
        signal: signal
    });
    return await res.json();
}