import {
    Bot, FileText, Loader2, Paperclip, Send, User, X, Eye,
    CheckCircle, AlertCircle, Copy, Check, Presentation,
    Cpu, Zap, Layers, Image as ImageIcon, Trash2, BookOpen, Pin
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useRef, useEffect, useState } from 'react';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const PIPELINE_STEPS = [
    { key: 'rewriting', label: 'Контекстуализация запроса' },
    { key: 'searching', label: 'Сканирование базы знаний' },
    { key: 'reranking', label: 'Семантическая фильтрация' },
    { key: 'generating', label: 'Синтез аналитического ответа' },
    { key: 'validating', label: 'Верификация данных' }
];

export default function ChatView({
                                     messages,
                                     isLoading,
                                     attachedFile,
                                     setAttachedFile,
                                     pastedImages = [],
                                     setPastedImages,
                                     fileInputRef,
                                     input,
                                     setInput,
                                     handleAsk,
                                     openPageImage,
                                     appStep,
                                     setAppStep,
                                     candidates,
                                     selectedChunkIds,
                                     setSelectedChunkIds,
                                     selectedImagePages = [],
                                     setSelectedImagePages,
                                     handleConfirmGeneration ={handleGenerate},
                                     chatMode,
                                     setChatMode,
                                     presentationMode,
                                     openGallery,
                                     setPresentationMode,
                                     cancelRequest,
                                     onDeleteMessage
                                 }) {

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const [copiedId, setCopiedId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // --- АВТО-СКРОЛЛ ---
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, appStep]);

    // --- ОБРАБОТКА ВВОДА ---
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    const handleTextareaInput = (e) => {
        const target = e.target;
        target.style.height = 'auto';
        target.style.height = `${Math.min(target.scrollHeight, 250)}px`;
        setInput(target.value);
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData.items;
        for (let item of items) {
            if (item.type.indexOf("image") !== -1) {
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => setPastedImages(prev => [...prev, event.target.result]);
                reader.readAsDataURL(file);
            }
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        const validFiles = files.filter(f =>
            ['pdf', 'pptx', 'docx'].includes(f.name.toLowerCase().split('.').pop())
        );
        if (validFiles.length > 0) setAttachedFile(prev => [...prev, ...validFiles]);
    };

    const onSend = () => {
        if ((!input.trim() && attachedFile.length === 0 && pastedImages.length === 0) || isLoading) return;
        handleAsk(input, attachedFile, setInput, setAttachedFile, chatMode, presentationMode);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleTextMode = (chunkId, pageRef) => {
        setSelectedImagePages(prev => prev.filter(p => p !== pageRef));
        setSelectedChunkIds(prev => prev.includes(chunkId) ? prev.filter(id => id !== chunkId) : [...prev, chunkId]);
    };

    const toggleImageMode = (chunkId, pageRef) => {
        setSelectedChunkIds(prev => prev.filter(id => id !== chunkId));
        setSelectedImagePages(prev => prev.includes(pageRef) ? prev.filter(p => p !== pageRef) : [...prev, pageRef]);
    };

    return (
        <div
            className={`flex-1 flex flex-col h-full relative bg-[#0d1117] transition-all duration-300 ${
                isDragging ? 'bg-blue-500/5 ring-4 ring-inset ring-blue-500/20' : ''
            }`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >

            {/* 1. ОБЛАСТЬ СООБЩЕНИЙ */}
            <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth font-sans relative z-10">

                {/* WELCOME SCREEN */}
                {messages.length === 0 && appStep === 'idle' && (
                    <div className="flex flex-col items-center justify-center min-h-full p-8 space-y-12 animate-in fade-in duration-1000 select-none">
                        <div className="text-center space-y-4">
                            <div className="relative w-fit mx-auto">
                                <div className="absolute inset-0 bg-blue-500/25 blur-[70px] rounded-full animate-pulse"></div>
                                <div className="relative bg-[#161b22] p-8 rounded-[45px] text-blue-500 border border-blue-500/20 shadow-2xl">
                                    <Bot size={60} strokeWidth={1.5} />
                                </div>
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase">SENSUM<span className="text-blue-500 not-italic ml-1">AI</span></h1>
                            <p className="text-gray-500 text-[10px] max-w-sm mx-auto font-black leading-relaxed uppercase tracking-[0.3em] opacity-70">Интеллектуальная среда анализа данных</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl">
                            <div className="p-6 bg-[#161b22] border border-gray-800 rounded-[35px] hover:border-amber-500/40 hover:shadow-[0_0_40px_-15px_rgba(245,158,11,0.3)] transition-all group cursor-default">
                                <div className="flex items-center gap-3 text-amber-500 mb-3">
                                    <Zap size={20}/> <span className="font-black text-[10px] uppercase tracking-widest">Fast Mode</span>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-relaxed group-hover:text-gray-400">Оперативный диалог на основе текущего контекста и визуальных данных, при этом не используется база знаний.</p>
                            </div>
                            <div className="p-6 bg-[#161b22] border border-gray-800 rounded-[35px] hover:border-blue-500/40 hover:shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)] transition-all group cursor-default">
                                <div className="flex items-center gap-3 text-blue-500 mb-3">
                                    <Layers size={20}/> <span className="font-black text-[10px] uppercase tracking-widest">AI Mode</span>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-relaxed group-hover:text-gray-400">Автоматизированный синтез ответа с использованием векторизованной базы знаний.</p>
                            </div>
                            <div className="p-6 bg-[#161b22] border border-gray-800 rounded-[35px] hover:border-indigo-500/40 hover:shadow-[0_0_40px_-15px_rgba(99,102,241,0.3)] transition-all group cursor-default">
                                <div className="flex items-center gap-3 text-indigo-500 mb-3">
                                    <Cpu size={20}/> <span className="font-black text-[10px] uppercase tracking-widest">Deep Mode</span>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-relaxed group-hover:text-gray-400">Расширенное исследование с возможностью ручного отбора ключевых источников.</p>
                            </div>
                            <div className="p-6 bg-[#161b22] border border-gray-800 rounded-[35px] hover:border-orange-500/40 hover:shadow-[0_0_40px_-15px_rgba(249,115,22,0.3)] transition-all group cursor-default">
                                <div className="flex items-center gap-3 text-orange-500 mb-3">
                                    <Presentation size={20}/> <span className="font-black text-[10px] uppercase tracking-widest">Audit Mode</span>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-relaxed group-hover:text-gray-400">Углубленная сверка тезисов, выявление несоответствий, при этом загружаемые файлы не попадают в базу знаний, а идут в контекст чата.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* СПИСОК СООБЩЕНИЙ */}
                <div className="p-4 md:px-10 md:py-12 space-y-12">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'} group/msg animate-in fade-in duration-300`}>
                            <div className={`max-w-[90%] md:max-w-[85%] p-7 rounded-[32px] shadow-2xl relative ${
                                m.role === 'USER' ? 'bg-[#1f6feb] text-white shadow-blue-500/10' : 'bg-[#161b22] border border-gray-800 text-gray-200'
                            }`}>
                                <div className={`absolute -top-3 ${m.role === 'USER' ? 'right-6' : 'left-6'} flex gap-2 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10`}>
                                    <button onClick={() => copyToClipboard(m.content, i)} className="p-2 bg-[#0d1117] border border-gray-700 rounded-xl hover:text-blue-400 transition-all text-gray-400 shadow-2xl"><Copy size={13} /></button>
                                    <button onClick={() => onDeleteMessage(m.id)} className="p-2 bg-[#0d1117] border border-gray-700 rounded-xl hover:text-red-500 transition-all text-gray-400 shadow-2xl"><Trash2 size={13} /></button>
                                </div>
                                <div className="flex items-center justify-between mb-5 opacity-40 text-[9px] uppercase font-black tracking-[0.2em]">
                                    <div className="flex items-center gap-2">{m.role === 'USER' ? <User size={12}/> : <Cpu size={12}/>}<span>{m.role === 'USER' ? 'Запрос пользователя' : 'Аналитическая система'}</span></div>
                                </div>
                                {m.role === 'USER' && (m.attachments?.length > 0 || m.images?.length > 0) && (
                                    <div className="flex flex-wrap gap-2 mb-5">
                                        {m.attachments?.map((name, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-2xl text-[10px] font-black"><FileText size={12} /> <span className="truncate max-w-[150px]">{name}</span></div>
                                        ))}
                                        {m.images?.map((img, idx) => (
                                            <img key={idx} src={img} className="h-28 w-28 object-cover rounded-2xl border border-white/20 shadow-2xl" alt="preview" />
                                        ))}
                                    </div>
                                )}
                                <div className="prose prose-invert prose-sm max-w-none prose-table:border prose-table:border-gray-800 prose-th:bg-gray-800/50 prose-th:p-3 prose-td:p-3 prose-td:border-t prose-td:border-gray-800">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                                {m.role === 'ASSISTANT' && m.sources?.length > 0 && (
                                    <div className="mt-8 flex gap-2 flex-wrap border-t border-gray-800 pt-6">
                                        {m.sources.map((src, idx) => (
                                            <button key={idx} onClick={() => openGallery(src.docId, src.pages, src.fileName)}
                                                    className="flex items-center gap-1.5 text-[10px] font-black bg-[#0d1117] border border-gray-700 px-4 py-2 rounded-2xl hover:border-blue-500 transition text-gray-400 group/src"
                                            ><FileText size={12}/> {src.fileName} <span className="text-blue-500/80 ml-1">({src.pages.join(', ')})</span></button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && appStep !== 'selecting' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in fade-in duration-500">
                            <div className="relative flex items-center justify-center">
                                <Loader2 className="animate-spin text-blue-500 absolute" size={48} strokeWidth={2} />
                                <div className="w-12 h-12 bg-blue-500/10 rounded-full animate-pulse"></div>
                            </div>
                            <div className="flex flex-col items-center space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 animate-pulse text-center">{PIPELINE_STEPS.find(s => s.key === appStep)?.label || 'Обработка данных...'}</span>
                                <div className="flex gap-2">
                                    {PIPELINE_STEPS.map((s, idx) => {
                                        const currentIndex = PIPELINE_STEPS.findIndex(step => step.key === appStep);
                                        const isActive = currentIndex >= idx;
                                        return <div key={s.key} className={`h-1 w-8 rounded-full transition-all duration-700 ${isActive ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-110' : 'bg-gray-800 scale-100'}`} />;
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* 2. ЭТАП ВЫБОРА КАРТОЧЕК */}
            {appStep === 'selecting' && (
                <div className="mx-6 mb-6 p-7 bg-[#161b22] border border-blue-500/30 rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-6 duration-300 z-30 relative">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <div className="flex flex-col"><h3 className="text-sm font-black text-blue-400 uppercase tracking-[0.2em]">Обнаруженные фрагменты ({candidates?.length || 0})</h3><span className="text-[10px] text-gray-500 mt-1 italic font-medium">Выберите наиболее релевантные данные для анализа</span></div>
                        <button onClick={() => setAppStep('idle')} className="text-gray-500 hover:text-white transition p-2"><X size={20}/></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {candidates?.map(c => {
                            const pageRef = `${c.docId}:${c.pageNum}`;
                            const isText = selectedChunkIds.includes(c.id);
                            const isImage = selectedImagePages.includes(pageRef);
                            return (
                                <div key={c.id} className={`p-6 rounded-[30px] border transition-all relative flex flex-col justify-between group ${isText ? 'border-blue-500 bg-blue-600/5 ring-1 ring-blue-500/20' : isImage ? 'border-orange-500 bg-orange-600/5 ring-1 ring-orange-500/20' : 'border-gray-800 bg-[#0d1117] hover:border-gray-700'}`}>
                                    <div><div className="flex justify-between items-start text-[9px] mb-4 font-black uppercase tracking-widest opacity-30"><span className="truncate max-w-[120px]">{c.fileName}</span><div className="flex items-center gap-2">{c.visionAvailable && <span className="text-orange-500">🖼️</span>}<span className="text-blue-400">{(c.score * 100).toFixed(0)}%</span></div></div><div className="text-[12px] leading-relaxed text-gray-300 line-clamp-4 italic mb-6 font-medium">"{c.text}"</div></div>
                                    <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-gray-800/50"><div className="flex gap-1.5"><button onClick={() => toggleTextMode(c.id, pageRef)} className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all ${isText ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>TEXT</button><button onClick={() => toggleImageMode(c.id, pageRef)} className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all ${isImage ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>IMAGE</button></div><button onClick={() => openPageImage(c.docId, c.pageNum, c.fileName)} className="p-2 bg-[#161b22] hover:bg-blue-600 rounded-xl text-gray-500 hover:text-white transition-all border border-gray-800"><Eye size={14} /></button></div>
                                    {isText && <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1.5 shadow-xl animate-in zoom-in"><CheckCircle size={16} /></div>}
                                    {isImage && <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-1.5 shadow-xl animate-in zoom-in"><ImageIcon size={16} /></div>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-4 mt-8 border-t border-gray-800 pt-6">
                        <button onClick={() => setAppStep('idle')} className="px-8 py-3 bg-[#21262d] hover:bg-gray-700 text-gray-300 rounded-2xl text-xs font-bold transition uppercase tracking-widest">Отмена</button>
                        <button onClick={handleConfirmGeneration} disabled={selectedChunkIds.length === 0 && selectedImagePages.length === 0} className="flex-1 bg-white text-black py-4 rounded-2xl font-black text-xs hover:bg-gray-200 shadow-2xl disabled:opacity-20 transition-all uppercase tracking-[0.2em]">Сформировать отчет ({selectedChunkIds.length + selectedImagePages.length})</button>
                    </div>
                </div>
            )}

            {/* 3. ЗОНА ВВОДА */}
            {appStep !== 'selecting' && (
                <div className="relative group/input pt-2">

                    <div className="px-6 pb-8 max-w-5xl mx-auto w-full relative z-10">

                        {/* ГЛАВНЫЙ КОНТЕЙНЕР (Вложения и текст теперь вместе внутри этой рамки) */}
                        <div className="bg-[#161b22]/90 backdrop-blur-xl border border-gray-800 rounded-[28px] overflow-hidden shadow-[0_25px_80px_-20px_rgba(0,0,0,1)] focus-within:border-blue-500/40 transition-all duration-500 ring-1 ring-white/5">

                            {/* ПРЕВЬЮ ВЛОЖЕНИЙ */}
                            {((attachedFile && attachedFile.length > 0) || (pastedImages && pastedImages.length > 0)) && (
                                <div className="flex flex-wrap gap-2 px-6 pt-5 pb-1 animate-in slide-in-from-bottom-2">
                                    {attachedFile?.map((file, idx) => (
                                        <div key={`f-${idx}`} className="flex items-center gap-2 bg-blue-600/20 backdrop-blur-xl border border-blue-500/30 p-2 px-4 rounded-xl text-[10px] text-blue-300 font-black shadow-xl">
                                            <FileText size={14}/><span className="truncate max-w-[120px]">{file.name}</span>
                                            <button onClick={() => setAttachedFile(prev => prev.filter((_, i) => i !== idx))} className="hover:text-red-500 p-0.5 ml-1"><X size={12}/></button>
                                        </div>
                                    ))}
                                    {pastedImages?.map((img, idx) => (
                                        <div key={`i-${idx}`} className="relative group shadow-xl">
                                            <img src={img} className="h-14 w-14 object-cover rounded-xl border border-gray-700 group-hover:border-blue-500 transition-all" alt="pasted" />
                                            <button onClick={() => setPastedImages(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={10}/></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ТЕКСТОВОЕ ПОЛЕ */}
                            {/* Динамический отступ: если есть вложения, верхний отступ меньше, чтобы они казались ближе к тексту */}
                            <div className={`px-6 pb-4 ${((attachedFile?.length > 0) || (pastedImages?.length > 0)) ? 'pt-2' : 'pt-4'}`}>
                    <textarea
                        ref={textareaRef} value={input} onPaste={handlePaste} onChange={handleTextareaInput} onKeyDown={handleKeyDown}
                        className="w-full bg-transparent outline-none text-[15px] resize-none min-h-[45px] max-h-[250px] text-gray-100 placeholder-gray-600 font-medium custom-scrollbar"
                        placeholder={isLoading ? "Обработка запроса..." : "Введите запрос (Ctrl + Enter для отправки)..."}
                        rows="1" disabled={isLoading}
                    />
                            </div>

                            {/* НИЖНЯЯ ПАНЕЛЬ */}
                            <div className="bg-[#0d1117]/60 px-5 py-3 border-t border-gray-800/40 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => fileInputRef.current.click()} className="p-2.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all">
                                        <Paperclip size={20}/>
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => setAttachedFile(Array.from(e.target.files))} accept=".pdf,.pptx,.docx" />

                                    <button onClick={() => setPresentationMode(!presentationMode)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black transition-all border ${presentationMode ? 'bg-orange-600 border-orange-500 text-white shadow-lg' : 'bg-[#1c2128] border-gray-700 text-gray-500 hover:text-gray-300'}`}>
                                        <Presentation size={14}/> AUDIT
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ */}
                                    <div className="flex bg-[#1c2128] p-1 rounded-[16px] border border-gray-800 shrink-0">
                                        <button onClick={() => setChatMode('FAST')} className={`px-4 py-1.5 rounded-[12px] text-[9px] font-black transition-all ${chatMode === 'FAST' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>FAST</button>
                                        <button onClick={() => setChatMode('AI')} className={`px-4 py-1.5 rounded-[12px] text-[9px] font-black transition-all ${chatMode === 'AI' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>AI</button>
                                        <button onClick={() => setChatMode('DEEP')} className={`px-4 py-1.5 rounded-[12px] text-[9px] font-black transition-all ${chatMode === 'DEEP' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>DEEP</button>
                                    </div>

                                    <button onClick={onSend} disabled={isLoading || (!input.trim() && attachedFile?.length === 0 && pastedImages?.length === 0)}
                                            className="p-3 bg-white text-black rounded-[18px] hover:bg-gray-200 disabled:opacity-5 transition-all active:scale-95 px-4">
                                        {isLoading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* НЕОНОВЫЙ ПОЛ */}
                    <div className="absolute bottom-0 left-0 right-0 h-[120px] pointer-events-none z-0">
                        {/* 1. Широкое мягкое свечение (фон) - снизу плотнее, сверху исчезает */}
                        <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-blue-600/40 via-blue-600/5 to-transparent blur-2xl"></div>

                        {/* 2. Концентрированное яркое свечение ближе к низу */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[60px] bg-gradient-to-t from-blue-500/50 to-transparent blur-xl"></div>

                        {/* 3. Яркая неоновая нить в самом низу, чтобы подчеркнуть границу */}
                        <div className="absolute bottom-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_rgba(96,165,250,0.8)]"></div>
                    </div>
                </div>
            )}
        </div>
    );
}