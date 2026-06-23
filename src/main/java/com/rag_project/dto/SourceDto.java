package com.rag_project.dto;

import java.util.List;

public record SourceDto(
        Long docId, String fileName, List<Integer> pages
) {}
