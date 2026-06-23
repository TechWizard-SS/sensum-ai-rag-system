package com.rag_project.dto;

import com.rag_project.model.ChatMode;

import java.util.List;

public record ChatRequest(
        String question,
        String sessionId,
        ChatMode mode,
        List<Long> includedDocIds,
        boolean presentationMode,
        List<String> imagesBase64,
        List<String> attachedFileNames
) {}
