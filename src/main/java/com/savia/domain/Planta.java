package com.savia.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "plantas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Planta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, unique = true, length = 140)
    private String slug;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 160)
    private String especie;

    @Column(columnDefinition = "text")
    private String descripcion;

    @Column(name = "fecha_adopcion")
    private LocalDate fechaAdopcion;

    @Column(length = 160)
    private String ubicacion;

    @Enumerated(EnumType.STRING)
    @Column(name = "luz_necesaria", length = 20)
    private LuzNecesaria luzNecesaria;

    @Column(name = "frecuencia_riego_dias")
    private Integer frecuenciaRiegoDias;

    @Column(name = "humedad_recomendada", length = 80)
    private String humedadRecomendada;

    @Column(name = "temperatura_min", precision = 4, scale = 1)
    private BigDecimal temperaturaMin;

    @Column(name = "temperatura_max", precision = 4, scale = 1)
    private BigDecimal temperaturaMax;

    @Column(name = "foto_principal_url", columnDefinition = "text")
    private String fotoPrincipalUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_manual", length = 20)
    private EstadoSalud estadoManual;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn;

    @PrePersist
    void alPersistir() {
        LocalDateTime ahora = LocalDateTime.now();
        this.creadoEn = ahora;
        this.actualizadoEn = ahora;
    }

    @PreUpdate
    void alActualizar() {
        this.actualizadoEn = LocalDateTime.now();
    }
}
