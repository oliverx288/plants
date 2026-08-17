package com.savia.web;

import com.savia.dto.UploadResponseDTO;
import com.savia.service.FileStorageService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final FileStorageService fileStorageService;

    public UploadController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UploadResponseDTO subir(@RequestParam("file") MultipartFile file) {
        String url = fileStorageService.guardar(file);
        return new UploadResponseDTO(url);
    }
}
