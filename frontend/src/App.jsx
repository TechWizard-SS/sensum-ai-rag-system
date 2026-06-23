import { useState, useRef, useEffect } from 'react';

// Компоненты
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import DeleteModal from './components/DeleteModal';
import DocumentViewer from './components/DocumentViewer';
import KnowledgeBaseView from './components/KnowledgeBaseView';
import SettingsView from './components/SettingsView';

// Хуки
import useChats from './hooks/useChats';
import useDocs from './hooks/useDocs';

// API
import { deleteDocumentApi } from './api/docsApi';
import { renameChatApi } from './api/chatApi';

export default function App() {
    const [view, setView] = useState('chat');
    const [leftPanel, setLeftPanel] = useState(true);

    // --- ДОКУМЕНТЫ --- (Сначала вызываем хуки)
    const {
        docs, loadDocs, toggleDocStatus,
        rightPanel, setRightPanel, selectedView,
        openGallery, closeViewer
    } = useDocs();

    // --- ЧАТЫ ---
    const {
        sessions, currentSessionId, setCurrentSessionId, messages, setMessages, isLoading,
        appStep, setAppStep, candidates,
        selectedChunkIds, setSelectedChunkIds,
        selectedImagePages, setSelectedImagePages,
        pastedImages, setPastedImages,
        chatMode, setChatMode,
        presentationMode, setPresentationMode,
        handleSearch, handleGenerate, deleteSession, createNewChat,
        renameChat, togglePin, cancelRequest, deleteMessage
    } = useChats(loadDocs, docs);

    // --- ОСТАЛЬНЫЕ СОСТОЯНИЯ ---
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [input, setInput] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [config, setConfig] = useState({
        openRouterKey: localStorage.getItem('openRouterKey') || '',
        defaultModel: localStorage.getItem('defaultModel') || 'google/gemini-flash-1.5'
    });

    const fileInputRef = useRef(null);

    useEffect(() => {
        // При смене чата очищаем вложения
        setAttachedFiles([]);
        setPastedImages([]);
    }, [currentSessionId]);


    const handleDeleteDoc = async (id) => {
        if (window.confirm("Удалить этот документ из базы и S3?")) {
            try {
                await deleteDocumentApi(id);
                await loadDocs();
            } catch (e) { alert("Ошибка удаления"); }
        }
    };

    return (
        <div className="flex h-screen bg-[#0d1117] text-gray-200 font-sans overflow-hidden">

            <Sidebar
                leftPanel={leftPanel} setLeftPanel={setLeftPanel}
                sessions={sessions} currentSessionId={currentSessionId}
                setCurrentSessionId={setCurrentSessionId}
                setView={setView} createNewChat={createNewChat}
                view={view} setDeleteConfirmId={setDeleteConfirmId}
                onRenameChat={renameChat}
                onTogglePin={togglePin}
            />

            <div className="flex-1 flex flex-col relative min-w-0">
                {view === 'chat' && (
                    <ChatView
                        messages={messages}
                        isLoading={isLoading}
                        attachedFile={attachedFiles}
                        setAttachedFile={setAttachedFiles}

                        pastedImages={pastedImages}
                        setPastedImages={setPastedImages}

                        fileInputRef={fileInputRef}
                        input={input}
                        setInput={setInput}

                        chatMode={chatMode}
                        setChatMode={setChatMode}
                        presentationMode={presentationMode}
                        setPresentationMode={setPresentationMode}

                        selectedImagePages={selectedImagePages}
                        setSelectedImagePages={setSelectedImagePages}
                        onDeleteMessage={deleteMessage}

                        visionMode={chatMode === 'AI'}
                        setVisionMode={(val) => setChatMode(val ? 'AI' : 'DEEP')}

                        cancelRequest={cancelRequest}
                        handleAsk={() => handleSearch(input, attachedFiles, setInput, setAttachedFiles, chatMode, presentationMode)}
                        openPageImage={(docId, pageNum, fileName) => openGallery(docId, [pageNum], fileName)}
                        openGallery={openGallery}

                        appStep={appStep}
                        setAppStep={setAppStep}
                        candidates={candidates}
                        selectedChunkIds={selectedChunkIds}
                        setSelectedChunkIds={setSelectedChunkIds}

                        handleConfirmGeneration={() => handleGenerate(input, setInput, presentationMode)}
                    />
                )}

                {view === 'kb' && (
                    <KnowledgeBaseView
                        docs={docs}
                        fetchDocs={loadDocs}
                        toggleDocStatus={toggleDocStatus}
                        onDeleteDoc={handleDeleteDoc}
                    />
                )}

                {view === 'settings' && (
                    <SettingsView config={config} setConfig={setConfig} />
                )}
            </div>

            <DocumentViewer
                rightPanel={rightPanel}
                setRightPanel={setRightPanel}
                selectedView={selectedView}
            />

            {deleteConfirmId && (
                <DeleteModal
                    onCancel={() => setDeleteConfirmId(null)}
                    onConfirm={async () => {
                        await deleteSession(deleteConfirmId);
                        setDeleteConfirmId(null);
                    }}
                />
            )}
        </div>
    );
}