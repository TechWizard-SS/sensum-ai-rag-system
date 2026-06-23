package com.rag_project.dto.rag;

import java.util.List;

public record ContextResult(
        String text,
        List<String> renderedImages
) {}
