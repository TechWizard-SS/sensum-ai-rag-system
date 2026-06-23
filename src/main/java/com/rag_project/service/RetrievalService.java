package com.rag_project.service;

import com.rag_project.model.DocumentPart;
import com.rag_project.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class RetrievalService {

    private final VectorStore vectorStore;

    public List<Document> searchCandidates(String query, List<Long> includedDocIds) {
        if (includedDocIds == null || includedDocIds.isEmpty()) {
            return List.of();
        }

        // Если запрос после рерайта стал пустым
        String searchQuery = (query == null || query.isBlank()) ? "information" : query;

        SearchRequest.Builder builder = SearchRequest.builder()
                .query(searchQuery)
                .topK(50)
                .similarityThreshold(0.35);
        String filterStr = buildFilter(includedDocIds);
        if (!filterStr.isBlank()) {
            builder.filterExpression(filterStr);
        }

        try {
            return vectorStore.similaritySearch(builder.build());
        } catch (Exception e) {
            log.error("Ошибка векторного поиска: {}", e.getMessage());
            return List.of();
        }
    }

    private String buildFilter(List<Long> includedDocIds) {
        if (includedDocIds == null || includedDocIds.isEmpty()) {
            return "";
        }

        String ids = includedDocIds.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(","));

        return "doc_id in [" + ids + "]";
    }
}
