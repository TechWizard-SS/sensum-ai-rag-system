package com.rag_project.repository;

import com.rag_project.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByChatSessionIdOrderByCreatedAtAsc(UUID sessionId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMessage m WHERE m.chatSession.id = :sessionId")
    void deleteByChatSessionId(UUID sessionId);
}
