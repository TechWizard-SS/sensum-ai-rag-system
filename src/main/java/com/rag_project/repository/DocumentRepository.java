package com.rag_project.repository;

import com.rag_project.model.DocumentPart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<DocumentPart, Long> {
    Boolean existsByFileHash(String hash);

    // Метод для легкого получения списка
    @Query("SELECT d.id as id, d.sourceName as sourceName, d.status as status, d.uploadDate as uploadDate, d.draft as draft FROM DocumentPart d")
    List<DocumentMetadata> findAllMetadata();

    // Метод для расчета веса базы данных
    @Query(value = "SELECT pg_total_relation_size('document_part') + pg_total_relation_size('vector_store') + pg_total_relation_size('chat_message')", nativeQuery = true)
    Long getTotalStorageSize();

    // Считаем размер файлов в S3 (из системной таблицы Supabase)
    @Query(value = "SELECT COALESCE(sum((metadata->>'size')::bigint), 0) FROM storage.objects WHERE bucket_id = 'document'", nativeQuery = true)
    Long getTotalS3Size();
}
