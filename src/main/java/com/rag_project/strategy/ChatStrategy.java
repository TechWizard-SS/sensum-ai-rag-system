package com.rag_project.strategy;

import com.rag_project.dto.ChatRequest;
import com.rag_project.dto.ChatResponse;
import com.rag_project.dto.rag.GenerationRequest;
import com.rag_project.model.ChatMode;

public interface ChatStrategy {
    ChatResponse execute(ChatRequest request);

    ChatResponse generateResponse(GenerationRequest request);

    boolean supports(ChatMode mode);
}
