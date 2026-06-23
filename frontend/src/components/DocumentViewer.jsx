import { X, ZoomIn, ZoomOut, Database } from 'lucide-react';
import { useState } from 'react';

export default function DocumentViewer({ rightPanel, setRightPanel, selectedView }) {
    const [zoom, setZoom] = useState(100);

    return (
        <div className={`${rightPanel ? 'w-[45%]' : 'w-0'} transition-all duration-500 bg-[#0d1117] border-l border-gray-800 flex flex-col relative z-40 overflow-hidden shadow-[-20px_0_50px_rgba(0,0,0,0.5)]`}>

            {/* Заголовок панели */}
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#161b22]">
                <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black uppercase text-blue-500 tracking-[0.2em] mb-1">Архив документов</span>
                    <span className="text-xs text-gray-300 truncate font-bold tracking-tight">
                        {selectedView?.name || 'Просмотр не активен'}
                    </span>
                </div>

                <div className="flex items-center gap-3 bg-[#0d1117] p-1.5 rounded-xl border border-gray-800">
                    <button onClick={() => setZoom(prev => Math.max(prev - 20, 40))} className="p-1.5 hover:text-white text-gray-500 transition-colors"><ZoomOut size={16}/></button>
                    <span className="text-[10px] font-mono text-blue-500 w-10 text-center font-black">{zoom}%</span>
                    <button onClick={() => setZoom(prev => Math.min(prev + 20, 200))} className="p-1.5 hover:text-white text-gray-500 transition-colors"><ZoomIn size={16}/></button>
                    <div className="w-px h-4 bg-gray-800 mx-1" />
                    <button onClick={() => setRightPanel(false)} className="hover:bg-red-500/20 hover:text-red-500 p-1.5 rounded-lg transition-all text-gray-500">
                        <X size={20}/>
                    </button>
                </div>
            </div>

            {/* Контентная часть */}
            <div className="flex-1 bg-[#0d1117] overflow-y-auto p-8 custom-scrollbar scroll-smooth">
                {!selectedView ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-700 text-center opacity-30">
                        <div className="mb-6 p-6 bg-gray-800/20 rounded-full animate-pulse"><Database size={64}/></div>
                        <p className="text-sm font-bold uppercase tracking-widest leading-relaxed">Выберите источник в чате,<br/>чтобы изучить детали</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-16 items-center">

                        {/* Режим ГАЛЕРЕИ (массив страниц) */}
                        {selectedView.pages && selectedView.pages.length > 0 ? (
                            selectedView.pages.map((page, index) => (
                                <div key={index} className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="w-full flex justify-between mb-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800/50 pb-2">
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Страница {page.num}
                                        </span>
                                        <span className="opacity-50">Ref ID: #{selectedView.docId || 'temp'}_{page.num}</span>
                                    </div>
                                    <div
                                        className="bg-white rounded-xl shadow-[0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300 ring-1 ring-white/10"
                                        style={{ width: `${zoom}%` }}
                                    >
                                        <img
                                            src={page.url}
                                            className="w-full h-auto block select-none"
                                            alt={`Page ${page.num}`}
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            /* Режим ОДИНОЧНОГО изображения (fallback) */
                            selectedView.url && (
                                <div className="flex flex-col items-center w-full">
                                    <div className="bg-white rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10" style={{ width: `${zoom}%` }}>
                                        <img src={selectedView.url} className="w-full h-auto" alt="Preview" />
                                    </div>
                                </div>
                            )
                        )}

                        <div className="py-20 text-[10px] font-black text-gray-800 uppercase tracking-[0.4em] w-full text-center border-t border-gray-900">
                            Конец документа
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}