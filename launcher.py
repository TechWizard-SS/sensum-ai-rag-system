import os
import json
import subprocess
import webbrowser
import threading
import time
import socket
import customtkinter as ctk
import tkinter as tk

# Настройки темы
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

CONFIG_FILE = "config.json"

class SensumLauncher(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Sensum AI - Launcher")
        self.geometry("550x880")
        self.resizable(False, False)

        self.app_process = None
        self.config = self.load_config()
        self.setup_ui()
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except: pass
        return {
            "dbUrl": "jdbc:postgresql://", "dbUser": "", "dbPass": "",
            "openRouterKey": "", "supabaseUrl": "https://",
            "supabaseKey": "", "supabaseBucket": "document"
        }

    def save_config(self):
        self.config["dbUrl"] = self.entry_url.get()
        self.config["dbUser"] = self.entry_user.get()
        self.config["dbPass"] = self.entry_pass.get()
        self.config["openRouterKey"] = self.entry_ai_key.get()
        self.config["supabaseUrl"] = self.entry_sb_url.get()
        self.config["supabaseKey"] = self.entry_sb_key.get()
        self.config["supabaseBucket"] = self.entry_sb_bucket.get()

        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=4, ensure_ascii=False)

    # --- ФУНКЦИИ БУФЕРА ОБМЕНА (FIX) ---
    def custom_paste(self, entry):
        try:
            text = self.clipboard_get()
            entry.insert(tk.INSERT, text)
        except: pass
        return "break" # Предотвращает дублирование вставки в некоторых системах

    def custom_copy(self, entry):
        try:
            text = entry.selection_get()
            self.clipboard_clear()
            self.clipboard_append(text)
        except: pass
        return "break"

    def show_context_menu(self, event, entry):
        m = tk.Menu(self, tearoff=0, bg="#1c1c1c", fg="white", borderwidth=0)
        m.add_command(label="Копировать", command=lambda: self.custom_copy(entry))
        m.add_command(label="Вставить", command=lambda: self.custom_paste(entry))
        m.add_separator()
        m.add_command(label="Выделить всё", command=lambda: entry.select_range(0, 'end'))
        m.tk_popup(event.x_root, event.y_root)

    def bind_shortcuts(self, entry):
        # Принудительная привязка горячих клавиш
        entry.bind("<Control-v>", lambda e: self.custom_paste(entry))
        entry.bind("<Control-V>", lambda e: self.custom_paste(entry))
        entry.bind("<Control-c>", lambda e: self.custom_copy(entry))
        entry.bind("<Control-C>", lambda e: self.custom_copy(entry))
        entry.bind("<Control-a>", lambda e: entry.select_range(0, 'end'))
        entry.bind("<Control-A>", lambda e: entry.select_range(0, 'end'))
        # Правая кнопка мыши
        entry.bind("<Button-3>", lambda e: self.show_context_menu(e, entry))

    def setup_ui(self):
        # Заголовок
        self.label_title = ctk.CTkLabel(self, text="SENSUM AI", font=ctk.CTkFont(size=28, weight="bold", slant="italic"))
        self.label_title.pack(pady=(20, 5))

        self.label_subtitle = ctk.CTkLabel(self, text="ИНТЕЛЛЕКТУАЛЬНАЯ СРЕДА АНАЛИЗА", font=ctk.CTkFont(size=10, weight="bold"))
        self.label_subtitle.pack(pady=(0, 20))

        # --- СЕКЦИИ ---
        self.create_section_label("БАЗА ДАННЫХ (POSTGRES / SUPABASE)")
        self.create_input("JDBC URL", "dbUrl", "entry_url")
        self.create_input("DB Username", "dbUser", "entry_user")
        self.create_input("DB Password", "dbPass", "entry_pass", show="*")

        self.create_section_label("SUPABASE STORAGE (S3)")
        self.create_input("Supabase API URL", "supabaseUrl", "entry_sb_url")
        self.create_input("Supabase Service Key", "supabaseKey", "entry_sb_key", show="*")
        self.create_input("Bucket Name", "supabaseBucket", "entry_sb_bucket")

        self.create_section_label("AI ENGINE")
        self.create_input("OpenRouter / OpenAI Key", "openRouterKey", "entry_ai_key", show="*")

        # Кнопка запуска
        self.btn_launch = ctk.CTkButton(self, text="ЗАПУСТИТЬ СИСТЕМУ", height=55, font=ctk.CTkFont(weight="bold"), command=self.start_application)
        self.btn_launch.pack(pady=(30, 10), padx=40, fill="x")

        self.status_label = ctk.CTkLabel(self, text="Статус: Готов к запуску", font=ctk.CTkFont(size=11))
        self.status_label.pack(pady=(0, 20))

    def create_section_label(self, text):
        lbl = ctk.CTkLabel(self, text=text, font=ctk.CTkFont(size=9, weight="bold"), text_color="#555555")
        lbl.pack(anchor="w", padx=45, pady=(10, 0))

    def create_input(self, label_text, config_key, attr_name, show=""):
        frame = ctk.CTkFrame(self, fg_color="transparent")
        frame.pack(fill="x", padx=40, pady=5)

        lbl = ctk.CTkLabel(frame, text=label_text, font=ctk.CTkFont(size=10, weight="bold"))
        lbl.pack(anchor="w")

        # Используем стандартный tk.Entry через обертку CustomTkinter
        entry = ctk.CTkEntry(frame, height=35)
        entry.insert(0, self.config.get(config_key, ""))
        if show: entry.configure(show=show)
        entry.pack(fill="x")

        # ВКЛЮЧАЕМ ХОТКЕИ (FIX)
        self.bind_shortcuts(entry)

        setattr(self, attr_name, entry)

    def is_port_open(self, port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            return s.connect_ex(('localhost', port)) == 0

    def monitor_server(self):
        while True:
            if self.is_port_open(8080):
                self.status_label.configure(text="Статус: СИСТЕМА АКТИВНА", text_color="#4CAF50")
                webbrowser.open("http://localhost:8080")
                break
            time.sleep(1)

    def start_application(self):
        self.save_config()
        self.btn_launch.configure(state="disabled", text="ЗАПУСК...")

        env = os.environ.copy()

        # Помощник для безопасного получения строк из конфига
        def get_safe(key, default=""):
            val = self.config.get(key)
            return str(val).strip() if val is not None else default

        # Основные настройки (теперь защищены от null)
        env["APP_DB_URL"] = get_safe("dbUrl")
        env["APP_DB_USER"] = get_safe("dbUser")
        env["APP_DB_PASS"] = get_safe("dbPass")

        env["APP_SB_URL"] = get_safe("supabaseUrl")
        env["APP_SB_KEY"] = get_safe("supabaseKey")
        env["APP_SB_BUCKET"] = get_safe("supabaseBucket")

        env["APP_AI_KEY"] = get_safe("openRouterKey")

        # Если baseUrl пустой или null, ставим твой рабочий дефолт
        base_url = self.config.get("baseUrl")
        if not base_url:
            base_url = "https://openrouter.ai/api"
        env["APP_AI_BASE_URL"] = base_url.strip()

        # Модели
        env["APP_AI_MODEL"] = get_safe("defaultModel", "google/gemini-flash-1.5")
        env["APP_EMBEDDING_MODEL"] = get_safe("embeddingModel", "openai/text-embedding-3-small")

        # Поиск JAR
        jar_candidates = ["build/libs/rag-project-0.0.1-SNAPSHOT.jar", "target/rag-project-0.0.1-SNAPSHOT.jar"]
        jar_path = next((path for path in jar_candidates if os.path.exists(path)), None)

        if not jar_path:
            self.status_label.configure(text="Ошибка: JAR не найден!", text_color="red")
            self.btn_launch.configure(state="normal", text="ПОВТОРИТЬ")
            return

        print(f"DEBUG: Запуск базы на URL: {env['APP_DB_URL']}")

        try:
            self.app_process = subprocess.Popen(
                ["java", "-jar", jar_path],
                env=env
            )
            threading.Thread(target=self.monitor_server, daemon=True).start()
        except Exception as e:
            self.status_label.configure(text=f"Ошибка: {str(e)}", text_color="red")
            self.btn_launch.configure(state="normal", text="ПОВТОРИТЬ")

    def on_closing(self):
        """Вызывается при закрытии окна лаунчера"""
        if self.app_process:
            print("Остановка Java-ядра...")
            self.app_process.terminate() # Посылаем сигнал остановки бэкенду
            # Если через 3 секунды не закрылся - убиваем принудительно
            try:
                self.app_process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.app_process.kill()

        self.destroy() # Закрываем само окно лаунчера
        os._exit(0)    # Полный выход из скрипта

if __name__ == "__main__":
    app = SensumLauncher()
    app.mainloop()