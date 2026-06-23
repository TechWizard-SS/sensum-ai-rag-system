package com.rag_project.repository;

import com.rag_project.model.DocumentPart;
import java.time.LocalDateTime;

public interface DocumentMetadata {
    Long getId();
    String getSourceName();
    DocumentPart.DocumentStatus getStatus();
    LocalDateTime getUploadDate();
    boolean isDraft();
}
