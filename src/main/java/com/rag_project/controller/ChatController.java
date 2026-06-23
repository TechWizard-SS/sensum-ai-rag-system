package com.rag_project.controller;

import com.rag_project.model.ChatMessage;
import com.rag_project.model.ChatSession;
import com.rag_project.repository.ChatMessageRepository;
import com.rag_project.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174"})
@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
public class ChatController {

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;

    @PostMapping
    public ChatSession createChat(@RequestParam(defaultValue = "Новый чат") String title) {
        ChatSession session = new ChatSession();
        session.setTitle(title);
        session.setCreatedAt(LocalDateTime.now());
        return sessionRepository.save(session);
    }

    @GetMapping
    public List<ChatSession> getAllChats() {
        return sessionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @GetMapping("/{id}/messages")
    public List<ChatMessage> getMessages(@PathVariable UUID id) {
        return messageRepository.findByChatSessionIdOrderByCreatedAtAsc(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChat(@PathVariable UUID id) {
        if (sessionRepository.existsById(id)) {
            sessionRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PatchMapping("/{id}")
    public ChatSession renameChat(@PathVariable UUID id, @RequestParam String title) {
        ChatSession session = sessionRepository.findById(id).orElseThrow();
        session.setTitle(title);
        return sessionRepository.save(session);
    }

    @PatchMapping("/{id}/pin")
    public ChatSession togglePin(@PathVariable UUID id) {
        ChatSession session = sessionRepository.findById(id).orElseThrow();
        session.setPinned(!session.isPinned());
        return sessionRepository.save(session);
    }

    @DeleteMapping("/messages/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long id) {
        if (messageRepository.existsById(id)) {
            messageRepository.deleteById(id);
            log.info("Сообщение {} удалено из базы", id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
