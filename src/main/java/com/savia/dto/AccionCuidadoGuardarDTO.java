package com.savia.dto;

import com.savia.domain.TipoAccion;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class AccionCuidadoGuardarDTO {

    @NotNull(message = "El tipo de cuidado es obligatorio")
    private TipoAccion tipo;

    /** Si no se indica, se usa la fecha y hora actuales. */
    private LocalDateTime fecha;

    private String notas;
    private String fotoUrl;
    private String ubicacionNueva;
}
