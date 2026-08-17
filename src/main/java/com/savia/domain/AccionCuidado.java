package com.savia.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "acciones_cuidado")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccionCuidado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "planta_id", nullable = false)
    private Planta planta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoAccion tipo;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Column(columnDefinition = "text")
    private String notas;

    @Column(name = "foto_url", columnDefinition = "text")
    private String fotoUrl;

    @Column(name = "ubicacion_nueva", length = 160)
    private String ubicacionNueva;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    void alPersistir() {
        this.creadoEn = LocalDateTime.now();
        if (this.fecha == null) {
            this.fecha = this.creadoEn;
        }
    }
}
