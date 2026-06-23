package com.rag_project.model;

public enum ChatMode {
    FAST,         // Без RAG, только контекст чата
    DEEP,         // Ручной аудит (выбор карточек)
    AI,           // Автопилот (RAG без выбора карточек)
}
