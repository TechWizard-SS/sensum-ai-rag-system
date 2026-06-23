package com.rag_project.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AppConfig {
    private String openRouterKey;
    private String defaultModel;
    private String baseUrl;
    private String embeddingModel;
    private String rerankerModel;
}
