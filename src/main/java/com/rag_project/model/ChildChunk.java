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
//public class ChildChunk {
//    @Id
//    @GeneratedValue(strategy = GenerationType.UUID)
//    private UUID id;
//
//    // Связь с родителем (чтобы вытащить большой текст)
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "parent_id")
//    private ParentChunk parent;
//
//    // Дублируем связь с файлом для быстрой фильтрации по docId
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "document_id")
//    private DocumentPart document;
//
//    @Column(columnDefinition = "TEXT")
//    private String content;
//
//    private int pageNumber;
//
//    // Вектор мы не храним через стандартный JPA (он его не поймет),
//    // мы будем работать с ним через JdbcTemplate, но поле пометим для ясности
//    @Transient
//    private float[] embedding;
//}