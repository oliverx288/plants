package com.savia.web;

import com.savia.dto.AccionCuidadoDTO;
import com.savia.dto.AccionCuidadoGuardarDTO;
import com.savia.dto.EstadisticasDTO;
import com.savia.service.AccionCuidadoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/plantas/{slug}")
public class PlantaCuidadoController {

    private final AccionCuidadoService accionCuidadoService;

    public PlantaCuidadoController(AccionCuidadoService accionCuidadoService) {
        this.accionCuidadoService = accionCuidadoService;
    }

    @GetMapping("/acciones")
    public List<AccionCuidadoDTO> historial(@PathVariable String slug) {
        return accionCuidadoService.listarHistorial(slug);
    }

    @PostMapping("/acciones")
    @ResponseStatus(HttpStatus.CREATED)
    public AccionCuidadoDTO registrar(@PathVariable String slug, @Valid @RequestBody AccionCuidadoGuardarDTO dto) {
        return accionCuidadoService.registrar(slug, dto);
    }

    @GetMapping("/diario")
    public List<AccionCuidadoDTO> diario(@PathVariable String slug) {
        return accionCuidadoService.listarDiario(slug);
    }

    @GetMapping("/estadisticas")
    public EstadisticasDTO estadisticas(@PathVariable String slug) {
        return accionCuidadoService.estadisticas(slug);
    }
}
