const API_BASE = "/api";
export async function fetchSessionsApi() {
    const res = await fetch(`${API_BASE}/chats`);
    if (!res.ok) throw new Error("Не удалось загрузить чаты");
    return await res.json();
}

export async function fetchMessagesApi(id) {
    const res = await fetch(`${API_BASE}/chats/${id}/messages`);
    if (!res.ok) throw new Error("Не удалось загрузить историю сообщений");
    return await res.json();
}

export async function createNewChatApi() {
    const res = await fetch(`${API_BASE}/chats?title=Новое исследование`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error("Не удалось создать новый чат");
    return await res.json();
}

export async function deleteSessionApi(id) {
    const res = await fetch(`${API_BASE}/chats/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error("Не удалось удалить чат");
    return res;
}

export async function renameChatApi(id, title) {
    const res = await fetch(`${API_BASE}/chats/${id}?title=${encodeURIComponent(title)}`, {
        method: 'PATCH'
    });
    if (!res.ok) throw new Error("Не удалось переименовать чат");
    return await res.json();
}

/**
 * ЭТАП 1: ГИБРИДНЫЙ ПОИСК
 **/
export async function askQuestionApi(question, sessionId, includedDocIds, mode, presentationMode, imagesBase64, attachedFileNames, signal) {
    if (!sessionId) throw new Error("Session ID is required");

    const res = await fetch(`${API_BASE}/rag/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: signal,
        body: JSON.stringify({
            question: question || "",
            sessionId: sessionId,
            mode: mode || "AI",
            includedDocIds: includedDocIds || [],
            presentationMode: !!presentationMode,
            imagesBase64: imagesBase64 || [],
            attachedFileNames: attachedFileNames || []
        })
    });
    if (!res.ok) throw new Error("Ошибка сервера");
    return await res.json();
}

/**
 * ЭТАП 2: ФИНАЛЬНАЯ ГЕНЕРАЦИЯ
 */
export async function generateAnswerApi(question, sessionId, selectedChunkIds, selectedImagePages, presentationMode, imagesBase64, attachedFileNames, signal) {
    const res = await fetch(`${API_BASE}/rag/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: signal,
        body: JSON.stringify({
            sessionId: sessionId,
            question: question,
            selectedChunkIds: selectedChunkIds || [],
            presentationMode: presentationMode || false,
            selectedImagePages: selectedImagePages || [],
            imagesBase64: imagesBase64 || [],
            attachedFileNames: attachedFileNames || []
        })
    });
    if (!res.ok) throw new Error("Ошибка сервера при генерации");
    return await res.json();
}

export async function searchCandidatesApi(question, includedDocIds) {
    const res = await fetch(`${API_BASE}/rag/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question,
            includedDocIds: includedDocIds || []
        })
    });
    if (!res.ok) throw new Error("Ошибка при поиске фрагментов");
    return await res.json();
}

export async function togglePinApi(id) {
    const res = await fetch(`${API_BASE}/chats/${id}/pin`, {
        method: 'PATCH'
    });
    if (!res.ok) throw new Error("Не удалось закрепить чат");
    return await res.json();
}