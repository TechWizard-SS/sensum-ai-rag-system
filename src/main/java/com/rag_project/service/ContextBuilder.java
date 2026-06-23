package com.rag_project.service;

import com.rag_project.dto.rag.ContextResult;
import com.rag_project.model.DocumentPart;
import com.rag_project.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class ContextBuilder {

    private final VisualRenderingService visualRenderingService;
    private final DocumentRepository documentRepository;
    private final SupabaseStorageService storageService;

    public ContextResult buildContext(List<Document> textDocs, List<String> imagePageRefs, ChatClient.PromptUserSpec userSpec) {
        StringBuilder textContext = new StringBuilder();
        List<String> renderedImagesBase64 = new ArrayList<>();
        Map<Long, byte[]> fileCache = new HashMap<>();

        if (imagePageRefs != null) {
            for (String ref : imagePageRefs) {
                try {
                    String[] parts = ref.split(":");
                    Long docId = Long.parseLong(parts[0]);
                    int pageNum = Integer.parseInt(parts[1]);

                    byte[] fileBytes = getFileBytes(docId, fileCache);
                    if (fileBytes != null) {
                        byte[] image = visualRenderingService.renderPage(fileBytes, pageNum, getFileName(docId));
                        if (image != null) {
                            userSpec.media(MimeTypeUtils.IMAGE_PNG, new ByteArrayResource(image));
                            renderedImagesBase64.add(Base64.getEncoder().encodeToString(image));
                        }
                    }
                } catch (Exception e) {
                    log.error("Ошибка Vision: {}", e.getMessage());
                }
            }
        }

        for (Document doc : textDocs) {
            textContext.append(String.format("\n[ИСТОЧНИК: %s, стр. %s]\n%s\n",
                    doc.getMetadata().get("source"), doc.getMetadata().get("page"), doc.getText()));
        }

        return new ContextResult(textContext.toString(), renderedImagesBase64);
    }


    private byte[] getFileBytes(Long docId, Map<Long, byte[]> cache) {
        if (cache.containsKey(docId)) return cache.get(docId);
        return documentRepository.findById(docId).map(doc -> {
            byte[] bytes = storageService.downloadFile(doc.getStoragePath());
            cache.put(docId, bytes);
            return bytes;
        }).orElse(null);
    }

    private String getFileName(Long docId) {
        return documentRepository.findById(docId).map(DocumentPart::getSourceName).orElse("file.pdf");
    }
}
