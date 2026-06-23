import { useEffect, useState, useCallback } from 'react';
import {
    fetchSessionsApi,
    fetchMessagesApi,
    createNewChatApi,
    deleteSessionApi,
    askQuestionApi,
    generateAnswerApi,
    renameChatApi,
    togglePinApi
} from '../api/chatApi';
import { uploadDocumentsApi, parseTempFileApi } from '../api/docsApi';

export default function useChats(loadDocs, allDocs) {
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [abortController, setAbortController] = useState(null);

    const [pastedImages, setPastedImages] = useState([]);
    const [pendingScreenshots, setPendingScreenshots] = useState([]);

    const [appStep, setAppStep] = useState('idle');
    const [candidates, setCandidates] = useState([]);

    const [selectedChunkIds, setSelectedChunkIds] = useState([]);
    const [selectedImagePages, setSelectedImagePages] = useState([]);

    const [chatMode, setChatMode] = useState('AI');
    const [presentationMode, setPresentationMode] = useState(false);

    // СОСТОЯНИЕ ДЛЯ ХРАНЕНИЯ ВОПРОСА МЕЖДУ ПОИСКОМ И ГЕНЕРАЦИЕЙ
    const [lastQuestion, setLastQuestion] = useState('');

    const loadSessions = useCallback(async () => {
        try {
            const data = await fetchSessionsApi();
            setSessions(data);
            if (data.length > 0 && !currentSessionId) {
                setCurrentSessionId(data[0].id);
            }
        } catch (e) { console.error("Ошибка загрузки сессий", e); }
    }, [currentSessionId]);

    const loadMessages = useCallback(async (id) => {
        try {
            const data = await fetchMessagesApi(id);
            setMessages(data);
            setAppStep('idle');
            setCandidates([]);
        } catch (e) { console.error("Ошибка истории", e); }
    }, []);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    useEffect(() => {
        if (currentSessionId) {
            loadMessages(currentSessionId);
            setPastedImages([]);
            setPendingScreenshots([]);
            setCandidates([]);
            setLastQuestion('');
        }
    }, [currentSessionId, loadMessages]);

    const renameChat = async (id, newTitle) => {
        try {
            const updatedChat = await renameChatApi(id, newTitle);
            setSessions(prev => prev.map(s => s.id === id ? { ...s, title: updatedChat.title } : s));
        } catch (e) { console.error("Ошибка переименования:", e); }
    };

    const togglePin = async (id) => {
        try {
            const updatedChat = await togglePinApi(id);
            setSessions(prev => prev.map(s => s.id === id ? { ...s, pinned: updatedChat.pinned } : s));
        } catch (e) { console.error("Ошибка закрепления:", e); }
    };

    const cancelRequest = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            setIsLoading(false);
            setAppStep('idle');
            setMessages(prev => [...prev, { role: 'ASSISTANT', content: "⚠️ Анализ прерван пользователем." }]);
        }
    };

    const handleSearch = async (input, files, setInput, setAttachedFiles, currentChatMode, currentPMode) => {
        if (!input.trim() && (!files || files.length === 0) && pastedImages.length === 0) return;

        // 1. ЗАПОМИНАЕМ ВОПРОС
        setLastQuestion(input);

        setIsLoading(true);
        const controller = new AbortController();
        setAbortController(controller);
        let activeSid = currentSessionId;

        try {
            if (!activeSid) {
                const newChat = await createNewChatApi();
                setSessions(prev => [newChat, ...prev]);
                setCurrentSessionId(newChat.id);
                activeSid = newChat.id;
            }

            const attachedNames = files ? Array.from(files).map(f => f.name) : [];
            const imagesToSearch = [...pastedImages];
            setPendingScreenshots(imagesToSearch);

            const userMsgForUI = {
                id: Date.now(), role: 'USER',
                content: input || (attachedNames.length > 0 ? "Анализ файлов..." : "[Изображение]"),
                attachments: attachedNames, images: imagesToSearch
            };
            setMessages(prev => [...prev, userMsgForUI]);

            if (setInput) setInput('');
            if (setAttachedFiles) setAttachedFiles([]);
            setPastedImages([]);

            const finalMode = currentChatMode || chatMode;
            const isAudit = currentPMode !== undefined ? currentPMode : presentationMode;
            const isFast = finalMode === 'FAST';
            let aiHiddenPrompt = input || "";

            if (files && files.length > 0) {
                setAppStep('rewriting');
                for (const file of files) {
                    if (isAudit || isFast) {
                        try {
                            const { text } = await parseTempFileApi(file, controller.signal);
                            aiHiddenPrompt += `\n\n--- FILE (${file.name}) ---\n${text}`;
                        } catch (err) { console.error("Parse error", err); }
                    }
                    if (!isAudit) await uploadDocumentsApi([file], controller.signal);
                }
                if (loadDocs && !isAudit) await loadDocs();
            }

            const activeDocIds = (allDocs || []).filter(d => d.status === 'READY').map(d => d.id);
            setAppStep('searching');

            const data = await askQuestionApi(aiHiddenPrompt, activeSid, activeDocIds, finalMode, isAudit, imagesToSearch, attachedNames, controller.signal);

            if (data.answer === "NEED_SELECTION") {
                setCandidates(data.candidates || []);
                setAppStep('selecting');
            } else {
                setAppStep('validating');
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ASSISTANT', content: data.answer, sources: data.sources }]);
                setAppStep('idle');
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.error("Search error:", e);
            setAppStep('idle');
        } finally {
            setIsLoading(false);
            setAbortController(null);
        }
    };

    const handleGenerate = async () => {
        if (selectedChunkIds.length === 0 && selectedImagePages.length === 0) return;

        setIsLoading(true);
        const controller = new AbortController();
        setAbortController(controller);
        setAppStep('generating');

        try {
            const data = await generateAnswerApi(
                lastQuestion,
                currentSessionId,
                selectedChunkIds,
                selectedImagePages,
                presentationMode,
                pendingScreenshots,
                [],
                controller.signal
            );

            setMessages(prev => [...prev, {
                id: Date.now(),
                role: 'ASSISTANT',
                content: data.answer,
                sources: data.sources
            }]);

            // ПОЛНАЯ ОЧИСТКА ПОСЛЕ УСПЕХА
            setCandidates([]);
            setSelectedChunkIds([]);
            setSelectedImagePages([]);
            setPendingScreenshots([]);
            setLastQuestion('');
            setAppStep('idle');

        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error("Generate error:", e);
                setAppStep('selecting');
            }
        } finally {
            setIsLoading(false);
            setAbortController(null);
        }
    };

    const deleteMessage = async (messageId) => {
        try {
            const res = await fetch(`http://127.0.0.1:8080/api/chats/messages/${messageId}`, { method: 'DELETE' });
            if (res.ok) setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (e) { console.error("Ошибка удаления сообщения", e); }
    };

    const deleteSession = async (id) => {
        try {
            await deleteSessionApi(id);
            setSessions(prev => prev.filter(s => s.id !== id));
            if (currentSessionId === id) { setCurrentSessionId(null); setMessages([]); }
        } catch (e) { console.error(e); }
    };

    const createNewChat = async () => {
        try {
            const newChat = await createNewChatApi();
            setSessions(prev => [newChat, ...prev]);
            setCurrentSessionId(newChat.id);
            setMessages([]);
            setAppStep('idle');
        } catch (e) { console.error(e); }
    };

    return {
        sessions, currentSessionId, setCurrentSessionId, messages, setMessages, isLoading,
        appStep, setAppStep, candidates,
        selectedChunkIds, setSelectedChunkIds,
        selectedImagePages, setSelectedImagePages,
        pastedImages, setPastedImages,
        chatMode, setChatMode, presentationMode, setPresentationMode,
        handleSearch, handleGenerate, deleteSession, createNewChat,
        cancelRequest,
        renameChat,
        togglePin,
        deleteMessage
    };
}