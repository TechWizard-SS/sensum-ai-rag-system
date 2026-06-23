package com.rag_project.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;

@Service
@Slf4j
public class DynamicConfigService {
    private final String CONFIG_PATH = "config.json";
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AppConfig loadConfig() {
        File file = new File(CONFIG_PATH);
        if (!file.exists()) return new AppConfig();
        try {
            return objectMapper.readValue(file, AppConfig.class);
        } catch (IOException e) {
            log.error("Ошибка чтения конфига", e);
            return new AppConfig();
        }
    }


    public void saveConfig(AppConfig config) {
        try {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File(CONFIG_PATH), config);
            log.info("Конфигурация сохранена в {}", CONFIG_PATH);
        } catch (IOException e) {
            log.error("Ошибка сохранения конфига", e);
        }
    }
}
