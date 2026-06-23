package com.rag_project.dto.rag;

import java.util.List;

public record GenerationRequest(
        String sessionId,
        String question,
        List<String> selectedChunkIds,
        boolean presentationMode,
        List<String> selectedImagePages,
        List<String> imagesBase64,
        List<String> attachedFileNames
) {}
