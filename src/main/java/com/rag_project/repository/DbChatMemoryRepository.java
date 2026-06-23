package com.rag_project.repository;

import com.rag_project.model.ChatMessage;
import com.rag_project.model.ChatSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class DbChatMemoryRepository implements ChatMemory {

    private final ChatMessageRepository messageRepository;
    private final ChatSessionRepository sessionRepository;

    @Override
    @Transactional
    public void add(String conversationId, List<Message> messages) {
        UUID sessionId = UUID.fromString(conversationId);
        ChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Сессия не найдена"));

        for (Message message : messages) {
            String rawText = message.getText();
            if (rawText == null || rawText.isEmpty()) continue;

            ChatMessage chatMessage = new ChatMessage();
            chatMessage.setChatSession(session);
            chatMessage.setContent(sanitizeText(rawText));
            chatMessage.setRole(message.getMessageType().name());
            chatMessage.setCreatedAt(LocalDateTime.now());

            if (message.getMetadata().containsKey("attachments")) {
                chatMessage.setAttachments((List<String>) message.getMetadata().get("attachments"));
            }
            if (message.getMetadata().containsKey("images")) {
                chatMessage.setImages((List<String>) message.getMetadata().get("images"));
            }

            messageRepository.save(chatMessage);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Message> get(String conversationId) {
        UUID sessionId = UUID.fromString(conversationId);
        List<ChatMessage> allMessages = messageRepository.findByChatSessionIdOrderByCreatedAtAsc(sessionId);

        int limit = 7;
        List<ChatMessage> limitedMessages = allMessages.size() > limit
                ? allMessages.subList(allMessages.size() - limit, allMessages.size())
                : allMessages;

        return limitedMessages.stream()
                .map(m -> {
                    if ("USER".equalsIgnoreCase(m.getRole())) {
                        var builder = UserMessage.builder().text(m.getContent());

                        if (m.getImages() != null && !m.getImages().isEmpty()) {
                            List<Media> mediaList = m.getImages().stream()
                                    .map(base64 -> {
                                        String raw = base64.contains(",") ? base64.split(",")[1] : base64;
                                        return new Media(
                                                org.springframework.util.MimeTypeUtils.IMAGE_PNG,
                                                new org.springframework.core.io.ByteArrayResource(java.util.Base64.getDecoder().decode(raw))
                                        );
                                    }).toList();
                            builder.media(mediaList);
                        }
                        return builder.build();
                    } else {
                        return new AssistantMessage(m.getContent());
                    }
                })
                .collect(Collectors.toList());
    }

    private String sanitizeText(String text) {
        if (text.contains("ВОПРОС:")) {
            text = text.split("ВОПРОС:")[text.split("ВОПРОС:").length - 1];
        } else if (text.contains("ВОПРОС ПОЛЬЗОВАТЕЛЯ:")) {
            text = text.split("ВОПРОС ПОЛЬЗОВАТЕЛЯ:")[text.split("ВОПРОС ПОЛЬЗОВАТЕЛЯ:").length - 1];
        }

        if (text.contains("--- КОНТЕКСТ ФАЙЛА")) {
            text = text.split("--- КОНТЕКСТ ФАЙЛА")[0];
        }

        return text.trim();
    }

    @Override
    @Transactional
    public void clear(String conversationId) {
        messageRepository.deleteByChatSessionId(UUID.fromString(conversationId));
    }
}
