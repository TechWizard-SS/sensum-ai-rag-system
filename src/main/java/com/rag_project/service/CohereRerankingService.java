package com.rag_project.service;

import com.rag_project.dto.rag.ChunkCandidateDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class CohereRerankingService {

    @Value("${spring.ai.openai.api-key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String RERANK_URL = "https://openrouter.ai/api/v1/rerank";

    public List<ChunkCandidateDto> rerank(String query, List<Document> documents) {
        if (documents.isEmpty()) return List.of();

        log.info("Этап 2: Реранкинг {} фрагментов через OpenRouter", documents.size());

        Map<String, Object> body = new HashMap<>();
        body.put("model", "cohere/rerank-v3.5");
        body.put("query", query);
        body.put("documents", documents.stream().map(Document::getText).toList());
        body.put("top_n", 15);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);

        try {
            Map<String, Object> response = restTemplate.postForObject(RERANK_URL, new HttpEntity<>(body, headers), Map.class);
            List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("data");
            if (results == null) results = (List<Map<String, Object>>) response.get("results");

            List<ChunkCandidateDto> candidates = new ArrayList<>();
            for (Map<String, Object> res : results) {
                int index = (int) res.get("index");
                if (index < 0 || index >= documents.size()) continue;

                double relevanceScore = ((Number) res.get("relevance_score")).doubleValue();
                Document doc = documents.get(index);
                candidates.add(mapToDto(doc, relevanceScore));
            }

            List<ChunkCandidateDto> distinctCandidates = candidates.stream()
                    .collect(Collectors.toMap(
                            ChunkCandidateDto::text,
                            c -> c,
                            (existing, replacement) -> existing.score() >= replacement.score() ? existing : replacement
                    ))
                    .values()
                    .stream()
                    .sorted(Comparator.comparingDouble(ChunkCandidateDto::score).reversed())
                    .toList();

            log.info("Реранкинг завершен. Уникальных чанков: {}", distinctCandidates.size());
            return distinctCandidates;

        } catch (Exception e) {
            log.error("Ошибка реранкинга: {}. Возвращаем базовые результаты.", e.getMessage());
            return fallback(documents);
        }
    }

    private List<ChunkCandidateDto> fallback(List<Document> documents) {
        return documents.stream()
                .map(doc -> mapToDto(doc, 0.5))
                .collect(Collectors.toMap(
                        ChunkCandidateDto::text,
                        c -> c,
                        (existing, replacement) -> existing
                ))
                .values().stream().toList();
    }

    private ChunkCandidateDto mapToDto(Document doc, double score) {
        Object pageObj = doc.getMetadata().get("page");
        int pageNum = (pageObj instanceof Number num) ? num.intValue() : 1;

        Object docIdObj = doc.getMetadata().get("doc_id");
        long docId = (docIdObj instanceof Number num) ? num.longValue() : 0L;

        return new ChunkCandidateDto(
                (String) doc.getMetadata().getOrDefault("chunk_id", UUID.randomUUID().toString()),
                doc.getText(),
                docId,
                (String) doc.getMetadata().getOrDefault("source", "Unknown"),
                pageNum,
                score,
                Boolean.TRUE.equals(doc.getMetadata().get("has_visuals"))
        );
    }
}
