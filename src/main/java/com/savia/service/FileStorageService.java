package com.savia.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final List<String> TIPOS_PERMITIDOS = List.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final Path directorio;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir) {
        this.directorio = Path.of(uploadDir).toAbsolutePath();
    }

    @PostConstruct
    void crearDirectorioSiNoExiste() {
        try {
            Files.createDirectories(directorio);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo preparar el directorio de subidas", e);
        }
    }

    public String guardar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new IllegalArgumentException("No se ha recibido ningún archivo");
        }
        String contentType = archivo.getContentType();
        if (contentType == null || !TIPOS_PERMITIDOS.contains(contentType)) {
            throw new IllegalArgumentException("Solo se admiten imágenes JPEG, PNG, WEBP o GIF");
        }

        String extension = extensionParaTipo(contentType);
        String nombreArchivo = UUID.randomUUID() + extension;

        try {
            Path destino = directorio.resolve(nombreArchivo);
            Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar la imagen", e);
        }

        return "/uploads/" + nombreArchivo;
    }

    private String extensionParaTipo(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }
}
