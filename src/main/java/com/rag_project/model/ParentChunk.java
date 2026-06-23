// ToDo:


//package com.rag_project.model;
//
//import jakarta.persistence.*;
//import lombok.Data;
//import lombok.NoArgsConstructor;
//import java.util.UUID;
//
//@Entity
//@Data
//@NoArgsConstructor
//public class ParentChunk {
//    @Id
//    @GeneratedValue(strategy = GenerationType.UUID)
//    private UUID id;
//
//    // Связь с файлом (твоим DocumentPart)
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "document_id")
//    private DocumentPart document;
//
//    @Column(columnDefinition = "TEXT")
//    private String content;
//
//    private String fileName;
//}