package com.rag_project.dto;

public record DocumentResponse(
        Long id,
        String name,
        String status,
        String uploadDate,
        String fileUrl
) {}
