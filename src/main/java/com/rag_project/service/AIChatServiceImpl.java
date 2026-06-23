package com.rag_project.service;
import com.rag_project.dto.ChatRequest;
import com.rag_project.dto.ChatResponse;
import com.rag_project.dto.rag.GenerationRequest;
import com.rag_project.repository.ChatSessionRepository;
import com.rag_project.strategy.ChatStrategy;
import com.rag_project.strategy.ResearchChatStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIChatServiceImpl implements AIChatService {

    private final List<ChatStrategy> strategies;
    private final ResearchChatStrategy researchStrategy;
    private final ChatSessionRepository sessionRepository;
    private final ChatClient chatClient;

    @Override
    public ChatResponse ask(ChatRequest request) {
        log.info("=== НОВЫЙ ЗАПРОС === Режим: {}, Вопрос: {}", request.mode(), request.question());

        ChatResponse response = strategies.stream()
                .filter(s -> s.supports(request.mode()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Режим не поддерживается"))
                .execute(request);

        UUID sessionId = UUID.fromString(request.sessionId());
        sessionRepository.findById(sessionId).ifPresent(session -> {
            if ("Новое исследование".equals(session.getTitle())) {
                generateTitleAsync(session.getId(), request.question());
            }
        });

        return response;
    }

    private void generateTitleAsync(UUID sessionId, String question) {
        CompletableFuture.runAsync(() -> {
            try {
                String aiTitle = chatClient.prompt()
                        .user("У тебя ОДНА ЗАДАЧА: придумать название для чата по вопросу: '" + question + "'. " +
                                "ПРАВИЛА: " +
                                "1. Выдай ТОЛЬКО текст названия. " +
                                "2. Максимум 3 слова. " +
                                "3. Никаких кавычек, списков и вариантов. " +
                                "4. Сразу пиши название.")
                        .call().content();

                String cleanTitle = aiTitle.replaceAll("(?i)Название:", "")
                        .replaceAll("[\\\"\\*]", "")
                        .trim();

                sessionRepository.findById(sessionId).ifPresent(session -> {
                    session.setTitle(cleanTitle);
                    sessionRepository.save(session);
                    log.info("Новое название чата: {}", cleanTitle);
                });
            } catch (Exception e) {
                log.error("Ошибка названия", e);
            }
        });
    }

    @Override
    public ChatResponse generateResponse(GenerationRequest request) {
        return researchStrategy.generateResponse(request);
    }
}
