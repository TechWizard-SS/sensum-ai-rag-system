package com.rag_project.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    @Value("${supabase.bucket}")
    private String bucketName;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Загружает файл в Supabase Storage и возвращает публичную ссылку
     */
    public String uploadFile(byte[] data, String fileName, String contentType) {
        // Формируем URL для загрузки (мы используем стандартный REST API Supabase)
        String url = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, bucketName, fileName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        // Используем service_role key для авторизации
        headers.set("Authorization", "Bearer " + supabaseKey);

        HttpEntity<byte[]> entity = new HttpEntity<>(data, headers);

        try {
            // Метод POST загружает файл
            restTemplate.postForEntity(url, entity, String.class);
            log.info("Файл {} успешно загружен в бакет {}", fileName, bucketName);

            // Формируем ПУБЛИЧНУЮ ссылку (т.к. мы сделали бакет Public)
            return String.format("%s/storage/v1/object/public/%s/%s", supabaseUrl, bucketName, fileName);
        } catch (Exception e) {
            log.error("Ошибка при загрузке в облако: {}", e.getMessage());
            throw new RuntimeException("Не удалось сохранить файл в S3: " + e.getMessage());
        }
    }

    public void deleteFile(String fileName) {
        String url = String.format("%s/storage/v1/object/%s/%s", supabaseUrl, bucketName, fileName);
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseKey);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            restTemplate.exchange(url, HttpMethod.DELETE, entity, String.class);
            log.info("Файл {} удален из облака", fileName);
        } catch (Exception e) {
            log.warn("Не удалось удалить файл из облака: {}", e.getMessage());
        }
    }

    public byte[] downloadFile(String fileName) {
        // Используем эндпоинт authenticated для скачивания
        String url = String.format("%s/storage/v1/object/authenticated/%s/%s", supabaseUrl, bucketName, fileName);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseKey);

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, byte[].class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Ошибка при скачивании файла из S3: {}", e.getMessage());
            return null;
        }
    }
}
