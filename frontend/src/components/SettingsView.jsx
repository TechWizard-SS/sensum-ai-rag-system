import { Key, Save, ShieldCheck, Database, Settings, Cpu, Globe, Zap, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SettingsView({ config, setConfig }) {
    const [pingStatus, setPingStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'

    const handleSave = async () => {
        // 1. Сохраняем локально для UI
        localStorage.setItem('openRouterKey', config.openRouterKey);
        localStorage.setItem('defaultModel', config.defaultModel);

        // 2. Отправляем на бэкенд, чтобы сервер переключил модели
        try {
            const res = await fetch('http://127.0.0.1:8080/api/settings/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) alert("Системное ядро обновлено и сохранено!");
        } catch (e) {
            alert("Настройки сохранены локально, но сервер недоступен.");
        }
    };

    const checkConnection = async () => {
        setPingStatus('loading');
        try {
            const start = Date.now();
            const res = await fetch('http://127.0.0.1:8080/api/settings/ping');
            const end = Date.now();
            if (res.ok) setPingStatus(`success (${end - start}ms)`);
            else setPingStatus('error');
        } catch (e) {
            setPingStatus('error');
        }
    };

    return (
        <div className="p-6 md:p-12 max-w-4xl mx-auto w-full animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between mb-10 border-b border-gray-800 pb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600/20 p-3 rounded-2xl text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                        <Settings size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight italic uppercase">Sensum<span className="text-blue-500 not-italic">AI</span> Config</h2>
                        <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] mt-1">Управление нейросетевым ядром</p>
                    </div>
                </div>

                <button onClick={checkConnection} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${
                    pingStatus.startsWith('success') ? 'bg-green-500/10 border-green-500/50 text-green-500' :
                        pingStatus === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}>
                    <Activity size={14} className={pingStatus === 'loading' ? 'animate-pulse' : ''}/>
                    {pingStatus === 'idle' ? 'ПРОВЕРИТЬ СВЯЗЬ' : pingStatus.toUpperCase()}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* БЛОК LLM И КЛЮЧЕЙ */}
                <div className="space-y-6">
                    <div className="bg-[#161b22] p-6 rounded-[32px] border border-gray-800 shadow-2xl">
                        <div className="flex items-center gap-2 mb-6">
                            <Key className="text-blue-500" size={16} />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Провайдер данных</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] text-gray-600 block mb-2 uppercase font-black tracking-tighter">API Endpoint (Ollama / OpenRouter)</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={14} />
                                    <input
                                        type="text"
                                        value={config.baseUrl || 'https://openrouter.ai/api/v1'}
                                        onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 pl-10 text-xs outline-none focus:border-blue-500 transition-all text-gray-300"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-600 block mb-2 uppercase font-black tracking-tighter">API Key</label>
                                <input
                                    type="password"
                                    value={config.openRouterKey}
                                    onChange={e => setConfig({ ...config, openRouterKey: e.target.value })}
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-xs outline-none focus:border-blue-500 transition-all text-blue-400 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#161b22] p-6 rounded-[32px] border border-gray-800 shadow-2xl">
                        <div className="flex items-center gap-2 mb-6">
                            <Cpu className="text-indigo-500" size={16} />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Аналитическая модель</h3>
                        </div>
                        <select
                            value={config.defaultModel || 'google/gemini-2.0-flash-lite-preview'}
                            onChange={e => setConfig({ ...config, defaultModel: e.target.value })}
                            className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-xs outline-none focus:border-blue-500 transition-all text-gray-300 cursor-pointer"
                        >
                            <option value="google/gemini-2.0-flash-lite-preview">Gemini 2.0 Flash Lite</option>
                            <option value="anthropic/claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                            <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</option>
                            <option value="deepseek/deepseek-chat">DeepSeek V3</option>
                        </select>
                    </div>
                </div>

                {/* БЛОК RAG ОПТИМИЗАЦИИ */}
                <div className="space-y-6">
                    <div className="bg-[#161b22] p-6 rounded-[32px] border border-gray-800 shadow-2xl">
                        <div className="flex items-center gap-2 mb-6">
                            <Zap className="text-amber-500" size={16} />
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">RAG Конфигурация</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] text-gray-600 block mb-2 uppercase font-black tracking-tighter">Embedding Model (Векторизатор)</label>
                                <input
                                    type="text"
                                    value={config.embeddingModel || 'openai/text-embedding-3-small'}
                                    onChange={e => setConfig({ ...config, embeddingModel: e.target.value })}
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-xs outline-none focus:border-blue-500 transition-all text-gray-300"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-600 block mb-2 uppercase font-black tracking-tighter">Reranker Model (Cohere / BGE)</label>
                                <input
                                    type="text"
                                    value={config.rerankerModel || 'cohere/rerank-v3.5'}
                                    onChange={e => setConfig({ ...config, rerankerModel: e.target.value })}
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-xs outline-none focus:border-blue-500 transition-all text-gray-300"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full bg-white text-black py-6 rounded-[24px] font-black text-[11px] hover:bg-blue-500 hover:text-white transition-all shadow-[0_20px_40px_rgba(0,0,0,0.3)] active:scale-95 uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                    >
                        <Save size={18} /> Применить конфигурацию
                    </button>
                </div>
            </div>

            <div className="mt-12 bg-[#161b22]/30 p-6 rounded-[24px] border border-gray-800/50 flex justify-between items-center px-8">
                <div className="flex items-center gap-3 text-gray-600">
                    <Database size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Node: Localhost | DB: Supabase Hybrid</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black text-blue-500/50 uppercase tracking-widest italic">v0.9.8-PROD_PREVIEW</span>
                </div>
            </div>
        </div>
    );
}