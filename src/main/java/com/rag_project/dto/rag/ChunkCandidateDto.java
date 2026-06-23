package com.rag_project.dto.rag;

public record ChunkCandidateDto(
        String id,          // Уникальный ID чанка из VectorStore
        String text,        // Сам текст чанка
        Long docId,         // К какому документу относится
        String fileName,    // Название файла (для удобства в UI)
        Integer pageNum,    // Номер страницы
        Double score,       // Релевантность (от 0 до 1)
        boolean visionAvailable // Есть ли картинка для этого чанка
) {}
