package com.rag_project.controller;

import com.rag_project.config.AppConfig;
import com.rag_project.config.DynamicConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174"}, allowCredentials = "true")
@RequiredArgsConstructor
public class SettingsController {

    private final DynamicConfigService configService;

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("Система активна");
    }

    @GetMapping("/current")
    public ResponseEntity<AppConfig> getCurrentSettings() {
        return ResponseEntity.ok(configService.loadConfig());
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateSettings(@RequestBody AppConfig settings) {
        configService.saveConfig(settings);
        return ResponseEntity.ok().build();
    }
}
