package com.rag_project.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcType;
import org.hibernate.type.descriptor.jdbc.VarbinaryJdbcType;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
public class DocumentPart {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String sourceName;

    @Column(unique = true)
    private String fileHash;

    @Enumerated(EnumType.STRING)
    private DocumentStatus status;

    private LocalDateTime uploadDate;

    private String fileUrl;

    private String storagePath;

    public enum DocumentStatus { PROCESSING, READY, FAILED, DISABLED }

    private boolean draft;
}
