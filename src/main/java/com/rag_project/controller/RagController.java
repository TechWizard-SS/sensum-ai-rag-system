package com.rag_project.controller;

import com.rag_project.dto.ChatRequest;
import com.rag_project.dto.ChatResponse;
import com.rag_project.dto.rag.ChunkCandidateDto;
import com.rag_project.dto.rag.GenerationRequest;
import com.rag_project.dto.rag.SearchRequest;
import com.rag_project.service.AIChatService;
import com.rag_project.service.CohereRerankingService;
import com.rag_project.service.RetrievalService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174"})
@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
public class RagController {

    private final RetrievalService retrievalService;
    private final AIChatService aiChatService;
    private final CohereRerankingService cohereRerankingService;

    @PostMapping("/ask")
    public ChatResponse ask(@RequestBody ChatRequest request) {
        return aiChatService.ask(request);
    }

    @PostMapping("/search")
    public List<ChunkCandidateDto> search(@RequestBody SearchRequest request) {
        var rawDocs = retrievalService.searchCandidates(request.question(), request.includedDocIds());
        return cohereRerankingService.rerank(request.question(), rawDocs);
    }

    @PostMapping("/generate")
    public ChatResponse generate(@RequestBody GenerationRequest request) {
        return aiChatService.generateResponse(request);
    }
}
