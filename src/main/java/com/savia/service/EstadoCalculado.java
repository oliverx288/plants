package com.savia.service;

import com.savia.domain.EstadoSalud;

public record EstadoCalculado(
        EstadoSalud estado,
        String mensaje,
        Integer diasDesdeUltimoRiego,
        String proximoCuidadoTexto
) {
}
