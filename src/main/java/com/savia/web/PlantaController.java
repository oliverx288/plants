package com.savia.web;

import com.savia.dto.PlantaDetalleDTO;
import com.savia.dto.PlantaGuardarDTO;
import com.savia.dto.PlantaResumenDTO;
import com.savia.service.PlantaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.List;

@RestController
@RequestMapping("/api/plantas")
public class PlantaController {

    private final PlantaService plantaService;

    public PlantaController(PlantaService plantaService) {
        this.plantaService = plantaService;
    }

    @GetMapping
    public List<PlantaResumenDTO> listar() {
        return plantaService.listarResumen();
    }

    @GetMapping("/{slug}")
    public PlantaDetalleDTO obtener(@PathVariable String slug, HttpServletRequest request) {
        return plantaService.obtenerDetalle(slug, origen(request));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlantaDetalleDTO crear(@Valid @RequestBody PlantaGuardarDTO dto, HttpServletRequest request) {
        return plantaService.crear(dto, origen(request));
    }

    @PutMapping("/{slug}")
    public PlantaDetalleDTO actualizar(@PathVariable String slug,
                                        @Valid @RequestBody PlantaGuardarDTO dto,
                                        HttpServletRequest request) {
        return plantaService.actualizar(slug, dto, origen(request));
    }

    @DeleteMapping("/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable String slug) {
        plantaService.eliminar(slug);
    }

    private String origen(HttpServletRequest request) {
        return ServletUriComponentsBuilder.fromContextPath(request).build().toUriString();
    }
}
