package com.rag_project.service;

import com.rag_project.dto.IndexingResponse;
import com.rag_project.model.DocumentPart;
import com.rag_project.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.jsoup.Jsoup;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class DocumentIntegrationService {

    private final VectorStore vectorStore;
    private final DocumentRepository repository;
    private final SupabaseStorageService storageService;

    // ============================================================
    // PDF
    // ============================================================
    public IndexingResponse processPdf(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String fileName = file.getOriginalFilename();
            String hash = calculateHash(bytes);

            DocumentPart docEntity = registerDocument(fileName, hash);
            if (docEntity == null) return new IndexingResponse(fileName, "SKIPPED", "Дубликат.");

            // UUID путь для S3 (решает проблему с кириллицей)
            String storageName = UUID.randomUUID() + ".pdf";
            String cloudUrl = storageService.uploadFile(bytes, storageName, "application/pdf");

            docEntity.setFileUrl(cloudUrl);
            docEntity.setStoragePath(storageName);
            repository.save(docEntity);

            try (PDDocument pdf = Loader.loadPDF(bytes)) {
                PDFTextStripper stripper = new PDFTextStripper();
                List<Document> allPages = new ArrayList<>();
                for (int p = 1; p <= pdf.getNumberOfPages(); p++) {
                    stripper.setStartPage(p); stripper.setEndPage(p);
                    String text = stripper.getText(pdf);
                    if (text == null || text.isBlank()) continue;
                    allPages.add(new Document(text, Map.of(
                            "source", fileName, "doc_id", docEntity.getId(), "page", p, "has_visuals", checkVisualsInPdfPage(pdf, p)
                    )));
                }
                saveToVectorStore(allPages, docEntity, "Pages: " + pdf.getNumberOfPages());
                return new IndexingResponse(fileName, "SUCCESS", "PDF готов.");
            }
        } catch (Exception e) {
            log.error("Error PDF: ", e);
            return new IndexingResponse(file.getOriginalFilename(), "ERROR", e.getMessage());
        }
    }

    // ============================================================
    // PPTX
    // ============================================================
    public IndexingResponse processPptx(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String fileName = file.getOriginalFilename();
            String hash = calculateHash(bytes);

            DocumentPart docEntity = registerDocument(fileName, hash);
            if (docEntity == null) return new IndexingResponse(fileName, "SKIPPED", "Дубликат.");

            String storageName = UUID.randomUUID() + ".pptx";
            String cloudUrl = storageService.uploadFile(bytes, storageName, "application/vnd.openxmlformats-officedocument.presentationml.presentation");

            docEntity.setFileUrl(cloudUrl);
            docEntity.setStoragePath(storageName);
            repository.save(docEntity);

            try (XMLSlideShow ppt = new XMLSlideShow(new ByteArrayInputStream(bytes))) {
                List<Document> allSlides = new ArrayList<>();
                int slideNum = 1;
                for (XSLFSlide slide : ppt.getSlides()) {
                    StringBuilder sb = new StringBuilder();
                    for (XSLFShape shape : slide.getShapes()) {
                        if (shape instanceof XSLFTextShape ts) sb.append(ts.getText()).append(" ");
                    }
                    if (sb.length() > 0) {
                        allSlides.add(new Document(sb.toString(), Map.of(
                                "source", fileName, "doc_id", docEntity.getId(), "page", slideNum, "has_visuals", true
                        )));
                    }
                    slideNum++;
                }
                saveToVectorStore(allSlides, docEntity, "Slides: " + (slideNum - 1));
                return new IndexingResponse(fileName, "SUCCESS", "PPTX готова.");
            }
        } catch (Exception e) {
            return new IndexingResponse(file.getOriginalFilename(), "ERROR", e.getMessage());
        }
    }

    // ============================================================
    // DOCX
    // ============================================================
    public IndexingResponse processDocx(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String fileName = file.getOriginalFilename();
            String hash = calculateHash(bytes);

            DocumentPart docEntity = registerDocument(fileName, hash);
            if (docEntity == null) return new IndexingResponse(fileName, "SKIPPED", "Дубликат.");

            // 1. ЗАГРУЗКА В S3 (UUID решает проблему кириллицы)
            String storageName = UUID.randomUUID() + ".docx";
            String cloudUrl = storageService.uploadFile(bytes, storageName, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

            docEntity.setFileUrl(cloudUrl);
            docEntity.setStoragePath(storageName);
            repository.save(docEntity);

            // 2. ПАРСИНГ
            try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes))) {
                XWPFWordExtractor extractor = new XWPFWordExtractor(doc);
                String text = extractor.getText();

                Document document = new Document(text, Map.of(
                        "source", fileName,
                        "doc_id", docEntity.getId(),
                        "type", "DOCX",
                        "page", 0, // 0 для документов без явных страниц
                        "has_visuals", false
                ));

                saveToVectorStore(List.of(document), docEntity, "Type: DOCX");
                return new IndexingResponse(fileName, "SUCCESS", "DOCX готов.");
            }
        } catch (Exception e) {
            log.error("Error DOCX: ", e);
            return new IndexingResponse(file.getOriginalFilename(), "ERROR", e.getMessage());
        }
    }

    // ============================================================
    // WEB URL
    // ============================================================
    public IndexingResponse processUrl(String url) {
        try {
            org.jsoup.nodes.Document webDoc = Jsoup.connect(url).userAgent("Mozilla/5.0").get();
            String title = webDoc.title();
            String content = webDoc.select("article, main, p, h1, h2, h3").text();
            return indexRawText(content, title.isEmpty() ? url : title, "WEB_URL", url);
        } catch (Exception e) {
            return new IndexingResponse(url, "ERROR", "URL Parser: " + e.getMessage());
        }
    }

    @Transactional
    public IndexingResponse indexRawText(String text, String sourceName, String type, String externalUrl) {
        String hash = calculateHash(text.getBytes());
        DocumentPart docEntity = registerDocument(sourceName, hash);
        if (docEntity == null) return new IndexingResponse(sourceName, "SKIPPED", "Дубликат.");

        if (externalUrl != null) {
            docEntity.setFileUrl(externalUrl);
            repository.save(docEntity);
        }

        Document document = new Document(text, Map.of(
                "source", sourceName, "doc_id", docEntity.getId(), "type", type, "page", 0, "has_visuals", false
        ));

        saveToVectorStore(List.of(document), docEntity, "Type: " + type);
        return new IndexingResponse(sourceName, "SUCCESS", "Текст готов.");
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private void saveToVectorStore(List<Document> docs, DocumentPart entity, String contentInfo) {
        TokenTextSplitter splitter = TokenTextSplitter.builder().withChunkSize(400).withMinChunkSizeChars(200).build();
        List<Document> chunks = splitter.apply(docs);
        chunks.forEach(c -> c.getMetadata().put("chunk_id", UUID.randomUUID().toString()));
        vectorStore.accept(chunks);
        entity.setStatus(DocumentPart.DocumentStatus.READY);
        entity.setContent(contentInfo);
        repository.save(entity);
    }

    private DocumentPart registerDocument(String fileName, String hash) {
        if (repository.existsByFileHash(hash)) return null;
        DocumentPart doc = new DocumentPart();
        doc.setSourceName(fileName);
        doc.setFileHash(hash);
        doc.setStatus(DocumentPart.DocumentStatus.PROCESSING);
        doc.setUploadDate(LocalDateTime.now());
        doc.setDraft(fileName.toLowerCase().endsWith(".pptx"));
        return repository.save(doc);
    }

    @Transactional
    public void deleteDocument(Long id) {
        repository.findById(id).ifPresent(doc -> {
            vectorStore.delete(new FilterExpressionBuilder().eq("doc_id", id).build());
            if (doc.getStoragePath() != null) storageService.deleteFile(doc.getStoragePath());
            repository.delete(doc);
        });
    }

    public IndexingResponse processFile(MultipartFile file) {
        String fileName = file.getOriginalFilename();
        if (fileName == null) return new IndexingResponse("unknown", "ERROR", "Empty filename");
        String lcName = fileName.toLowerCase();
        if (lcName.endsWith(".pdf")) return processPdf(file);
        if (lcName.endsWith(".pptx")) return processPptx(file);
        if (lcName.endsWith(".docx")) return processDocx(file);
        return new IndexingResponse(fileName, "ERROR", "Format not supported");
    }

    @Transactional
    public void deleteMultipleDocuments(List<Long> ids) {
        if (ids != null) ids.forEach(this::deleteDocument);
    }

    private boolean checkVisualsInPdfPage(PDDocument pdf, int pageNum) {
        try {
            var resources = pdf.getPage(pageNum - 1).getResources();
            for (var name : resources.getXObjectNames()) {
                if (resources.isImageXObject(name)) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    private String calculateHash(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    public String parseFileToTextOnly(MultipartFile file) {
        String fileName = file.getOriginalFilename().toLowerCase();
        try {
            if (fileName.endsWith(".pdf")) {
                try (PDDocument pdf = Loader.loadPDF(file.getBytes())) {
                    return new PDFTextStripper().getText(pdf);
                }
            } else if (fileName.endsWith(".docx")) {
                try (XWPFDocument doc = new XWPFDocument(file.getInputStream())) {
                    return new XWPFWordExtractor(doc).getText();
                }
            } else if (fileName.endsWith(".pptx")) {
                try (XMLSlideShow ppt = new XMLSlideShow(file.getInputStream())) {
                    StringBuilder sb = new StringBuilder();
                    for (XSLFSlide slide : ppt.getSlides()) {
                        for (XSLFShape shape : slide.getShapes()) {
                            if (shape instanceof XSLFTextShape ts) sb.append(ts.getText()).append(" ");
                        }
                    }
                    return sb.toString();
                }
            }
            return "Формат не поддерживается для парсинга текста";
        } catch (Exception e) {
            log.error("Ошибка временного парсинга: {}", e.getMessage());
            return "Ошибка при чтении файла: " + e.getMessage();
        }
    }
}
