package com.rag_project.dto.rag;

import java.util.List;

public record SearchRequest(
        String question,
        List<Long> includedDocIds
) {}
