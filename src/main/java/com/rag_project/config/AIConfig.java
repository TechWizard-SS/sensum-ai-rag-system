package com.rag_project.config;

import com.rag_project.repository.DbChatMemoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.openai.OpenAiEmbeddingModel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
@RequiredArgsConstructor
public class AIConfig {


    @Bean
    public ChatClient ragChatClient(DynamicChatModel dynamicChatModel) {
        return ChatClient.builder(dynamicChatModel).build();
    }

    @Bean
    public ChatMemory chatMemory(DbChatMemoryRepository dbChatMemoryRepository) {
        return dbChatMemoryRepository;
    }

    @Bean
    @Primary
    public EmbeddingModel primaryEmbeddingModel(OpenAiEmbeddingModel openAiEmbeddingModel) {
        return openAiEmbeddingModel;
    }
}
