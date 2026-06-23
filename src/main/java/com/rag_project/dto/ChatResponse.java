package com.rag_project.dto;

import com.rag_project.dto.rag.ChunkCandidateDto;

import java.util.List;

public record ChatResponse(
        String answer,
        List<SourceDto> sources,
        List<ChunkCandidateDto> candidates

) {
    public ChatResponse(String answer, List<SourceDto> sources) {
        this(answer, sources, List.of());
    }
}
