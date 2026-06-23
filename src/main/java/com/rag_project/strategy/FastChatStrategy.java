package com.rag_project.strategy;

import com.rag_project.dto.ChatRequest;
import com.rag_project.dto.ChatResponse;
import com.rag_project.dto.rag.GenerationRequest;
import com.rag_project.model.ChatMode;
import com.rag_project.service.PromptService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeTypeUtils;
import java.util.Base64;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class FastChatStrategy implements ChatStrategy {
    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final PromptService promptService;

    @Override
    public ChatResponse execute(ChatRequest request) {
        String sid = request.sessionId();

        List<String> currentAttachments = request.attachedFileNames() != null
                ? request.attachedFileNames()
                : List.of();

        String answer = chatClient.prompt()
                .advisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, sid).param("chat_memory_retrieve_size", 10))
                .system(promptService.getFastChatSystemPrompt())
                .user(userSpec -> {
                    userSpec.text(request.question());

                    userSpec.metadata("attachments", currentAttachments);

                    userSpec.metadata("images", request.imagesBase64());

                    for (String base64 : request.imagesBase64()) {
                        attachMedia(userSpec, base64);
                    }
                })
                .call().content();

        return new ChatResponse(answer, List.of());
    }

    private void attachMedia(ChatClient.PromptUserSpec spec, String base64) {
        try {
            String raw = base64.contains(",") ? base64.split(",")[1] : base64;
            spec.media(MimeTypeUtils.IMAGE_PNG, new ByteArrayResource(Base64.getDecoder().decode(raw)));
        } catch (Exception e) {
            log.error("Ошибка прикрепления изображения: {}", e.getMessage());
        }
    }

    @Override public boolean supports(ChatMode mode) { return mode == ChatMode.FAST; }

    @Override
    public ChatResponse generateResponse(GenerationRequest request) {
        throw new UnsupportedOperationException("Fast Mode не поддерживает ручную выборку карт для генерации ответа.");
    }
}
