package com.rag_project.controller;
import com.rag_project.dto.DocumentResponse;
import com.rag_project.dto.IndexingResponse;
import com.rag_project.model.DocumentPart;
import com.rag_project.repository.DocumentRepository;
import com.rag_project.service.DocumentIntegrationService;
import com.rag_project.service.SupabaseStorageService;
import com.rag_project.service.VisualRenderingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174"})
@RestController
@RequestMapping("/api/docs")
@RequiredArgsConstructor
@Slf4j
public class DocController {

    private final DocumentRepository repository;
    private final DocumentIntegrationService fileService;
    private final VisualRenderingService visualRenderingService;
    private final SupabaseStorageService storageService;

    // ИНДИКАТОР ПАМЯТИ
    @GetMapping("/usage")
    public Map<String, Object> getUsage() {
        return Map.of(
                "database", Map.of(
                        "used", repository.getTotalStorageSize(),
                        "limit", 524288000L // 500 MB
                ),
                "storage", Map.of(
                        "used", repository.getTotalS3Size(),
                        "limit", 1073741824L // 1 GB
                )
        );
    }

    // ЗАГРУЗКА (Одиночная и Множественная)
    @PostMapping("/upload-pdf")
    public ResponseEntity<IndexingResponse> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(fileService.processFile(file));
    }

    @PostMapping("/upload-multiple")
    public ResponseEntity<List<IndexingResponse>> uploadMultiple(@RequestParam("files") MultipartFile[] files) {
        List<IndexingResponse> responses = new ArrayList<>();
        for (MultipartFile file : files) {
            responses.add(fileService.processFile(file));
        }
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/upload-url")
    public ResponseEntity<IndexingResponse> uploadUrl(@RequestParam String url) {
        try {
            return ResponseEntity.ok(fileService.processUrl(url));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new IndexingResponse(url, "ERROR", e.getMessage()));
        }
    }

    // ПРОСМОТР ФАЙЛА (Редирект на S3)
    @GetMapping("/{id}/view")
    public ResponseEntity<?> getFile(@PathVariable Long id) {
        return repository.findById(id)
                .map(doc -> ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(doc.getFileUrl()))
                        .build())
                .orElse(ResponseEntity.notFound().build());
    }

    // РЕНДЕРИНГ СТРАНИЦЫ (Для превью в чате)
    @GetMapping("/{id}/page/{num}")
    public ResponseEntity<byte[]> getPageImage(@PathVariable Long id, @PathVariable int num) {
        return repository.findById(id).map(doc -> {
            // Скачиваем файл из S3
            byte[] fileBytes = storageService.downloadFile(doc.getStoragePath());

            byte[] image = visualRenderingService.renderPage(fileBytes, num, doc.getSourceName());

            if (image == null) return ResponseEntity.status(HttpStatus.NO_CONTENT).<byte[]>build();

            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(image);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        try {
            fileService.deleteDocument(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteBatch(@RequestBody List<Long> ids) {
        log.info("Массовое удаление документов: {}", ids);
        ids.forEach(fileService::deleteDocument);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/all")
    public List<DocumentResponse> getAll() {
        return repository.findAll().stream()
                .map(doc -> new DocumentResponse(
                        doc.getId(),
                        doc.getSourceName(),
                        doc.getStatus().name(),
                        doc.getUploadDate().toString(),
                        doc.getFileUrl()
                ))
                .toList();
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<DocumentResponse> toggleStatus(@PathVariable Long id) {
        return repository.findById(id).map(doc -> {
            doc.setStatus(doc.getStatus() == DocumentPart.DocumentStatus.READY
                    ? DocumentPart.DocumentStatus.DISABLED
                    : DocumentPart.DocumentStatus.READY);
            repository.save(doc);
            return ResponseEntity.ok(new DocumentResponse(
                    doc.getId(),
                    doc.getSourceName(),
                    doc.getStatus().name(),
                    doc.getUploadDate().toString(),
                    doc.getFileUrl()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/parse-temp")
    public Map<String, String> parseTemp(@RequestParam("file") MultipartFile file) {
        String text = fileService.parseFileToTextOnly(file);
        return Map.of("text", text);
    }
}
