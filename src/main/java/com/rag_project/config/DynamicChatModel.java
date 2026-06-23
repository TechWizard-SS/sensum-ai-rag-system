package com.rag_project.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
@Slf4j
public class DynamicChatModel implements ChatModel {

    private final DynamicConfigService configService;
    private final ChatModel originalModel;

    @Value("${spring.ai.openai.chat.options.model}")
    private String fallbackModel;

    @Value("${app.ai.site-url}")
    private String siteUrl;

    @Value("${app.ai.name}")
    private String appName;

    public DynamicChatModel(DynamicConfigService configService,
                            @Qualifier("openAiChatModel") ChatModel originalModel) {
        this.configService = configService;
        this.originalModel = originalModel;
    }

    @Override
    public ChatResponse call(Prompt prompt) {
        var config = configService.loadConfig();

        String targetModel = (config.getDefaultModel() != null && !config.getDefaultModel().isBlank())
                ? config.getDefaultModel()
                : fallbackModel;

        prompt.getInstructions().forEach(msg -> {
            msg.getMetadata().remove("images");
            msg.getMetadata().remove("attachments");
        });

        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(targetModel)
                .temperature(0.7)
                .build();

        options.getHttpHeaders().put("HTTP-Referer", siteUrl);
        options.getHttpHeaders().put("X-Title", appName);

        Prompt dynamicPrompt = new Prompt(prompt.getInstructions(), options);

        log.info("📡 ИИ Запрос | Модель: {} | Провайдер: {}",
                targetModel, System.getenv("APP_AI_BASE_URL"));

        return originalModel.call(dynamicPrompt);
    }

    @Override
    public ChatOptions getDefaultOptions() {
        return originalModel.getDefaultOptions();
    }
}
