package com.rag_project.config;

import com.rag_project.dto.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        log.error("Runtime exception: ", ex);
        return buildResponse(HttpStatus.BAD_REQUEST, "Business Logic Error", ex.getMessage());
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDbError(Exception ex) {
        log.error("Database integrity error: ", ex);
        return buildResponse(HttpStatus.CONFLICT, "Database Error", "Нарушена целостность данных (возможно, такой файл уже существует)");
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(org.springframework.web.server.ResponseStatusException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getReason());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex) {
        log.error("Unhandled exception: ", ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "System Error", "Произошла непредвиденная ошибка на сервере.");
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String error, String message) {
        return ResponseEntity
                .status(status)
                .body(new ErrorResponse(error, message, LocalDateTime.now()));
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxSizeError(Exception ex) {
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE, "File Error",
                "Файлы слишком тяжелые. Лимит одного запроса — 300МБ.");
    }
}
