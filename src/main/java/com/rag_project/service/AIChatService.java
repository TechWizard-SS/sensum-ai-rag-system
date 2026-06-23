package com.rag_project.service;

import com.rag_project.dto.ChatRequest;
import com.rag_project.dto.ChatResponse;
import com.rag_project.dto.rag.GenerationRequest;

public interface AIChatService {
    ChatResponse ask(ChatRequest chatRequest);
    ChatResponse generateResponse(GenerationRequest request);
    }
