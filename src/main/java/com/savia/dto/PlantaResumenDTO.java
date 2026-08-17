package com.savia.dto;

import com.savia.domain.EstadoSalud;

import java.time.LocalDate;

public record PlantaResumenDTO(
        Long id,
        String slug,
        String nombre,
        String especie,
        String fotoPrincipalUrl,
        EstadoSalud estado,
        String mensajeEstado,
        LocalDate fechaUltimoRiego,
        Integer diasDesdeUltimoRiego,
        String proximoCuidadoTexto
) {
}
