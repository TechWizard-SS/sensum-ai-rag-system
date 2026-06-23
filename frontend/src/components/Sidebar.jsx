import { MessageSquare, Plus, Settings, MoreVertical, Trash2, Edit3, Pin, PanelLeftOpen, PanelLeftClose, Database } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function Sidebar({
                                    leftPanel, setLeftPanel, sessions, currentSessionId,
                                    setCurrentSessionId, setView, createNewChat, view,
                                    setDeleteConfirmId, onRenameChat, onTogglePin
                                }) {
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    const menuRef = useRef(null);

    // Закрытие меню при клике вне
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpenId(null);
            }
        };
        if (menuOpenId) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpenId]);

    const sortedSessions = [...sessions].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Сохранение
    const handleSaveEdit = (id) => {
        if (editTitle.trim()) {
            onRenameChat(id, editTitle);
        }
        setEditingId(null);
    };

    const handleTogglePin = (e, id) => {
        e.stopPropagation();
        onTogglePin(id);
        setMenuOpenId(null);
    };



    return (
        <>
            {!leftPanel && (
                <button
                    onClick={() => setLeftPanel(true)}
                    className="fixed top-4 left-4 z-[100] p-3 bg-[#161b22] border border-gray-700 rounded-xl text-gray-400 hover:text-white shadow-2xl transition-all"
                >
                    <PanelLeftOpen size={24} />
                </button>
            )}

            <div className={`${leftPanel ? 'w-72' : 'w-0'} transition-all duration-300 bg-[#161b22] border-r border-gray-800 flex flex-col relative z-50 overflow-hidden`}>
                <div className="w-72 flex flex-col h-full">
                    <div className="p-4 border-b border-gray-800/50 flex items-center gap-2">
                        <button onClick={createNewChat} className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-[#238636] rounded-lg text-sm font-bold hover:bg-[#2ea043] transition active:scale-95">
                            <Plus size={18}/> Новый чат
                        </button>
                        <button onClick={() => setLeftPanel(false)} className="p-2.5 text-gray-500 hover:bg-gray-800 rounded-lg transition">
                            <PanelLeftClose size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        <p className="text-[10px] uppercase font-black text-gray-500 px-3 mb-2 tracking-widest mt-4">История запросов</p>

                        {sortedSessions.map(s => (
                            <div key={s.id}
                                 onClick={() => { if (editingId !== s.id) { setCurrentSessionId(s.id); setView('chat'); } }}
                                 className={`group p-3 rounded-xl cursor-pointer flex items-center gap-3 relative transition-all ${
                                     currentSessionId === s.id ? 'bg-[#21262d] text-white shadow-md border border-gray-700' : 'text-gray-400 hover:bg-[#1c2128]'
                                 }`}>

                                <div className="shrink-0">
                                    {s.pinned ? (
                                        <Pin size={14} className="text-blue-500 fill-blue-500 rotate-45" />
                                    ) : (
                                        <MessageSquare size={16} className={currentSessionId === s.id ? 'text-blue-400' : 'text-gray-600'} />
                                    )}
                                </div>

                                {editingId === s.id ? (
                                    <div className="flex-1" onClick={e => e.stopPropagation()}>
                                        <input
                                            autoFocus
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSaveEdit(s.id);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            onBlur={() => setEditingId(null)}
                                            className="bg-[#0d1117] border border-blue-500 rounded-lg px-2 w-full text-sm outline-none py-1 text-white shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                                        />
                                    </div>
                                ) : (
                                    <span className="truncate text-sm flex-1 pr-8 font-medium">{s.title}</span>
                                )}

                                {editingId !== s.id && (
                                    <div className="absolute right-2 flex items-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpenId(menuOpenId === s.id ? null : s.id);
                                            }}
                                            className={`p-1 rounded-md hover:bg-gray-700 transition-opacity ${menuOpenId === s.id ? 'opacity-100 bg-gray-700' : 'opacity-0 group-hover:opacity-100'}`}>
                                            <MoreVertical size={14}/>
                                        </button>

                                        {menuOpenId === s.id && (
                                            <div
                                                ref={menuRef}
                                                className="absolute top-8 right-0 w-44 bg-[#1c2128] border border-gray-700 rounded-xl shadow-2xl z-[100] py-2 animate-in zoom-in-95 duration-100">
                                                <button onClick={(e) => handleTogglePin(e, s.id)}
                                                        className="w-full text-left px-4 py-2 text-xs flex items-center gap-3 hover:bg-gray-800 transition">
                                                    <Pin size={12} className={s.pinned ? 'text-blue-500 fill-blue-500' : ''}/>
                                                    {s.pinned ? 'Открепить' : 'Закрепить'}
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title); setMenuOpenId(null); }}
                                                        className="w-full text-left px-4 py-2 text-xs flex items-center gap-3 hover:bg-gray-800 transition text-gray-300">
                                                    <Edit3 size={12}/> Переименовать
                                                </button>
                                                <div className="h-px bg-gray-700 my-1.5 mx-2" />
                                                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(s.id); setMenuOpenId(null); }}
                                                        className="w-full text-left px-4 py-2 text-xs flex items-center gap-3 hover:bg-red-500/10 text-red-400 transition">
                                                    <Trash2 size={12}/> Удалить чат
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-gray-800 space-y-1 bg-[#161b22]/50 mt-auto">
                        <button onClick={() => setView('kb')} className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${view === 'kb' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/20' : 'hover:bg-gray-800 text-gray-400'}`}>
                            <Database size={18}/> База знаний
                        </button>
                        <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all ${view === 'settings' ? 'bg-gray-700 text-white' : 'hover:bg-gray-800 text-gray-400'}`}>
                            <Settings size={18}/> Настройки
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}