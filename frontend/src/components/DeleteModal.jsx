import { Trash2, AlertTriangle } from 'lucide-react';

export default function DeleteModal({ onCancel, onConfirm }) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#161b22] border border-gray-800 p-8 rounded-3xl max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] border-t-red-500/20">
                <div className="flex justify-center mb-6">
                    <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center animate-pulse">
                        <Trash2 className="text-red-500" size={28}/>
                    </div>
                </div>

                <h3 className="text-xl font-bold mb-2 text-center text-white">Удалить исследование?</h3>
                <p className="text-gray-400 text-sm mb-8 text-center leading-relaxed">
                    Все сообщения и аналитические данные будут удалены безвозвратно. Вы уверены?
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition active:scale-95"
                    >
                        Да, удалить
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-3 bg-[#21262d] text-gray-300 rounded-xl font-semibold hover:bg-gray-700 transition"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}