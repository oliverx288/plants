package com.savia.dto;

import com.savia.domain.TipoAccion;

import java.time.LocalDateTime;

public record AccionCuidadoDTO(
        Long id,
        TipoAccion tipo,
        LocalDateTime fecha,
        String notas,
        String fotoUrl,
        String ubicacionNueva
) {
}
