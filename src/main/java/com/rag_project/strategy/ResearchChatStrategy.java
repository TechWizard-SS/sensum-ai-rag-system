package com.rag_project.strategy;

import com.rag_project.dto.ChatRequest;
import com.rag_project.dto.ChatResponse;
import com.rag_project.dto.SourceDto;
import com.rag_project.dto.rag.ChunkCandidateDto;
import com.rag_project.dto.rag.GenerationRequest;
import com.rag_project.model.ChatMode;
import com.rag_project.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeTypeUtils;

import java.util.*;
import java.util.stream.Collectors;


@Component
@RequiredArgsConstructor
@Slf4j
public class ResearchChatStrategy implements ChatStrategy {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final RetrievalService retrievalService;
    private final CohereRerankingService rerankingService;
    private final ContextBuilder contextBuilder;
    private final QueryRewriterService queryRewriter;
    private final PromptService promptService;
    private final VectorStore vectorStore;

    @Override
    public ChatResponse execute(ChatRequest request) {
        UUID sid = UUID.fromString(request.sessionId());

        // 1. Умный рерайт запроса
        String searchPrompt = queryRewriter.rewrite(request.sessionId(), request.question());
        if (searchPrompt == null || searchPrompt.isBlank()) searchPrompt = request.question();

        // 2. Поиск кандидатов
        var rawDocs = retrievalService.searchCandidates(searchPrompt, request.includedDocIds());
        if (rawDocs.isEmpty()) return new ChatResponse("В архиве не найдено информации.", List.of());

        // 3. Реранкинг
        List<ChunkCandidateDto> candidates = rerankingService.rerank(searchPrompt, rawDocs);

        // --- ЛОГИКА AI MODE (АВТОПИЛОТ) ---
        if (request.mode() == ChatMode.AI) {
            List<ChunkCandidateDto> top = candidates.stream().limit(5).toList();
            List<String> textIds = new ArrayList<>();
            List<String> imageRefs = new ArrayList<>();

            for (var c : top) {
                if (c.visionAvailable()) {
                    imageRefs.add(c.docId() + ":" + c.pageNum());
                } else {
                    textIds.add(c.id());
                }
            }

            List<Document> textDocs = findDocumentsByChunkIds(textIds, request.question());

            // ИСПРАВЛЕНО: Передаем прикрепленные имена файлов
            return performGeneration(sid, request.question(), textDocs, imageRefs,
                    request.presentationMode(), request.imagesBase64(),
                    request.attachedFileNames());
        }

        // РЕЖИМ DEEP: Возврат карточек на фронтенд
        return new ChatResponse("NEED_SELECTION", groupSourcesFromCandidates(candidates), candidates);
    }

    @Override
    public ChatResponse generateResponse(GenerationRequest request) {
        UUID sid = UUID.fromString(request.sessionId());
        List<Document> selectedDocs = findDocumentsByChunkIds(request.selectedChunkIds(), request.question());

        // ИСПРАВЛЕНО: Передаем прикрепленные имена файлов
        return performGeneration(sid, request.question(), selectedDocs, request.selectedImagePages(),
                request.presentationMode(), request.imagesBase64(),
                request.attachedFileNames());
    }

    private ChatResponse performGeneration(UUID sessionId, String question, List<Document> textDocs,
                                           List<String> imagePages, boolean isPresentation,
                                           List<String> chatScreenshots, List<String> attachedFileNames) {

        // Список всех картинок для сохранения в историю
        List<String> allImagesForHistory = new ArrayList<>();
        if (chatScreenshots != null) allImagesForHistory.addAll(chatScreenshots);

        // 1. RESEARCHER
        var draft = chatClient.prompt()
                .system(promptService.getResearcherSystemPrompt(isPresentation))
                .user(u -> {
                    // Получаем результат контекста и картинки
                    var context = contextBuilder.buildContext(textDocs, imagePages, u);
                    allImagesForHistory.addAll(context.renderedImages());

                    u.text("ДАННЫЕ:\n" + context.text() + "\n\nВОПРОС: " + question);
                    attachScreenshots(u, chatScreenshots);
                }).call().content();

        // 2. CRITIC (аналогично вызываем contextBuilder, чтобы он прикрепил медиа и для критика)
        String finalAnswer = chatClient.prompt()
                .system(promptService.getCriticSystemPrompt(isPresentation))
                .user(u -> {
                    contextBuilder.buildContext(textDocs, imagePages, u);
                    u.text("ЧЕРНОВИК:\n" + draft);
                    attachScreenshots(u, chatScreenshots);
                })
                .call().content();

        // 3. СОХРАНЕНИЕ В ИСТОРИЮ
        UserMessage userMessage = new UserMessage(question);
        // В историю попадут и скриншоты, и страницы PDF
        userMessage.getMetadata().put("images", allImagesForHistory);
        if (attachedFileNames != null) userMessage.getMetadata().put("attachments", attachedFileNames);

        chatMemory.add(sessionId.toString(), List.of(userMessage, new AssistantMessage(finalAnswer)));

        return new ChatResponse(finalAnswer, groupSources(textDocs));
    }


    private void attachScreenshots(ChatClient.PromptUserSpec u, List<String> screenshots) {
        if (screenshots != null) {
            for (String base64 : screenshots) {
                try {
                    String raw = base64.contains(",") ? base64.split(",")[1] : base64;
                    u.media(MimeTypeUtils.IMAGE_PNG, new ByteArrayResource(Base64.getDecoder().decode(raw)));
                } catch (Exception e) {
                    log.error("Ошибка прикрепления скриншота: {}", e.getMessage());
                }
            }
        }
    }

    private List<Document> findDocumentsByChunkIds(List<String> ids, String query) {
        if (ids == null || ids.isEmpty()) return List.of();
        String safeQuery = (query == null || query.isBlank()) ? "selected_chunks" : query;
        String filter = "chunk_id in [" + ids.stream().map(id -> "'" + id + "'").collect(Collectors.joining(",")) + "]";

        return vectorStore.similaritySearch(
                SearchRequest.builder().query(safeQuery).topK(ids.size()).filterExpression(filter).build()
        );
    }

    private List<SourceDto> groupSources(List<Document> docs) {
        return docs.stream()
                .collect(Collectors.groupingBy(
                        d -> {
                            Object docId = d.getMetadata().get("doc_id");
                            return (docId instanceof Number num) ? num.longValue() : 0L;
                        },
                        Collectors.mapping(d -> {
                            Object page = d.getMetadata().get("page");
                            return (page instanceof Number num) ? num.intValue() : 0;
                        }, Collectors.toList())
                ))
                .entrySet().stream()
                .map(entry -> {
                    String name = docs.stream()
                            .filter(d -> {
                                Object docId = d.getMetadata().get("doc_id");
                                return (docId instanceof Number num) && num.longValue() == entry.getKey();
                            })
                            .findFirst()
                            .map(d -> (String) d.getMetadata().getOrDefault("source", "Файл"))
                            .orElse("Файл");
                    return new SourceDto(entry.getKey(), name, entry.getValue().stream().distinct().sorted().toList());
                }).toList();
    }

    private List<SourceDto> groupSourcesFromCandidates(List<ChunkCandidateDto> candidates) {
        return candidates.stream()
                .collect(Collectors.groupingBy(ChunkCandidateDto::docId, Collectors.mapping(ChunkCandidateDto::pageNum, Collectors.toList())))
                .entrySet().stream()
                .map(entry -> {
                    String name = candidates.stream()
                            .filter(c -> c.docId().equals(entry.getKey()))
                            .findFirst()
                            .map(ChunkCandidateDto::fileName)
                            .orElse("Источник");
                    return new SourceDto(entry.getKey(), name, entry.getValue().stream().distinct().sorted().toList());
                }).toList();
    }

    @Override
    public boolean supports(ChatMode mode) { return mode == ChatMode.AI || mode == ChatMode.DEEP; }
}
