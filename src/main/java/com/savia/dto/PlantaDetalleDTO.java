package com.savia.dto;

import com.savia.domain.EstadoSalud;
import com.savia.domain.LuzNecesaria;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PlantaDetalleDTO(
        Long id,
        String slug,
        String nombre,
        String especie,
        String descripcion,
        LocalDate fechaAdopcion,
        String ubicacion,
        LuzNecesaria luzNecesaria,
        Integer frecuenciaRiegoDias,
        String humedadRecomendada,
        BigDecimal temperaturaMin,
        BigDecimal temperaturaMax,
        String fotoPrincipalUrl,
        EstadoSalud estadoManual,
        EstadoSalud estado,
        String mensajeEstado,
        Integer diasDesdeUltimoRiego,
        String proximoCuidadoTexto,
        String urlNfc,
        boolean esPropia
) {
}
