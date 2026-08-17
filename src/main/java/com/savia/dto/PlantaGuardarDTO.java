package com.savia.dto;

import com.savia.domain.EstadoSalud;
import com.savia.domain.LuzNecesaria;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class PlantaGuardarDTO {

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    private String especie;
    private String descripcion;
    private LocalDate fechaAdopcion;
    private String ubicacion;
    private LuzNecesaria luzNecesaria;

    @Min(value = 1, message = "La frecuencia de riego debe ser de al menos 1 día")
    private Integer frecuenciaRiegoDias;

    private String humedadRecomendada;
    private BigDecimal temperaturaMin;
    private BigDecimal temperaturaMax;
    private String fotoPrincipalUrl;

    /** null = calcular el estado automáticamente a partir del historial de riegos. */
    private EstadoSalud estadoManual;
}
