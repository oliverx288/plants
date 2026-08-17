package com.savia.dto;

import java.util.List;

public record EstadisticasDTO(
        long numRiegos,
        long numAbonados,
        long numPodas,
        long numTrasplantes,
        long fotografias,
        Integer diasDesdeUltimoRiego,
        List<EvolucionMensualDTO> evolucionMensual
) {
    public record EvolucionMensualDTO(String mes, long total) {
    }
}
