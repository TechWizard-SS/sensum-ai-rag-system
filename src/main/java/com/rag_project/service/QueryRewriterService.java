package com.rag_project.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class QueryRewriterService {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;

    public String rewrite(String sessionId, String currentQuestion) {
        try {
            List<Message> history = chatMemory.get(sessionId);
            if (history.isEmpty()) return currentQuestion;

            String historyText = history.stream()
                    .skip(Math.max(0, history.size() - 4))
                    .map(m -> m.getMessageType().getValue().toUpperCase() + ": " + m.getText())
                    .collect(Collectors.joining("\n"));

            String rewritten = chatClient.prompt()
                    .user(u -> u.text("""
                    СИСТЕМНАЯ ФУНКЦИЯ: Модуль семантической реконструкции запросов для векторного RAG-поиска.

                    ВХОДНЫЕ ДАННЫЕ:
                    [КОНТЕКСТ ДИАЛОГА]
                    %s

                    [ЦЕЛЕВОЙ ЗАПРОС]
                    %s

                    АЛГОРИТМ РЕКОНСТРУКЦИИ:
                    1. РАЗРЕШЕНИЕ КОРЕФЕРЕНЦИИ: Замени все местоимения и указательные слова (он, она, это, этот метод, там) в ЦЕЛЕВОМ ЗАПРОСЕ на конкретные термины, имена или сущности из КОНТЕКСТА ДИАЛОГА.
                    2. ОЧИСТКА ОТ ШУМА: Удали разговорные паттерны ("подскажи", "пожалуйста", "а как насчет", "можешь найти").
                    3. ОПТИМИЗАЦИЯ ДЛЯ ЭМБЕДДИНГОВ: Сформируй плотный, информативный поисковый запрос. Он должен звучать не как вопрос к собеседнику, а как заголовок или выдержка из энциклопедии.

                    ОГРАНИЧЕНИЕ ВЫВОДА:
                    Сгенерируй ТОЛЬКО финальную строку запроса. Категорически запрещены кавычки, префиксы, вводные слова и любые пояснения.
                    """.formatted(historyText, currentQuestion)))
                    .call()
                    .content();

            // Если ИИ вернул что-то странное или пустое — используем оригинал
            if (rewritten == null || rewritten.isBlank() || rewritten.length() < 2) {
                return currentQuestion;
            }

            return rewritten.trim();
        } catch (Exception e) {
            log.error("Ошибка рерайта запроса: {}. Используем оригинал.", e.getMessage());
            return currentQuestion;
        }
    }
}
