package com.savia.service;

import com.savia.domain.EstadoSalud;
import com.savia.domain.Planta;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Traduce el historial de riegos de una planta (y un posible estado manual)
 * en un estado de salud y un mensaje en tono propio de la planta.
 *
 * El cálculo automático se basa únicamente en la regularidad del riego: es
 * una señal simple pero suficiente para un mensaje útil. Los problemas que
 * no se detectan por fechas (plagas, enfermedades...) se marcan a mano con
 * el estado manual "PROBLEMAS" al editar la planta.
 */
@Component
public class EstadoPlantaCalculator {

    private static final List<String> MENSAJES_SALUDABLE = List.of(
            "Todo en orden por aquí.",
            "Crece con calma, sin sobresaltos.",
            "Está creciendo muy bien.",
            "Responde bien a los cuidados de las últimas semanas.",
            "Un ritmo de cuidado ejemplar."
    );

    public EstadoCalculado calcular(Planta planta, LocalDateTime ultimoRiego) {
        Integer diasDesdeUltimoRiego = ultimoRiego == null
                ? null
                : (int) ChronoUnit.DAYS.between(ultimoRiego.toLocalDate(), LocalDate.now());

        String proximoCuidadoTexto = calcularProximoCuidadoTexto(planta, ultimoRiego);

        if (planta.getEstadoManual() == EstadoSalud.PROBLEMAS) {
            return new EstadoCalculado(
                    EstadoSalud.PROBLEMAS,
                    "Esta planta necesita un poco más de atención.",
                    diasDesdeUltimoRiego,
                    proximoCuidadoTexto
            );
        }

        Integer frecuencia = planta.getFrecuenciaRiegoDias();

        if (ultimoRiego == null) {
            EstadoSalud estado = planta.getEstadoManual() != null ? planta.getEstadoManual() : EstadoSalud.ATENCION;
            return new EstadoCalculado(
                    estado,
                    "Todavía no se ha registrado ningún riego.",
                    null,
                    proximoCuidadoTexto
            );
        }

        if (planta.getEstadoManual() != null) {
            // Estado forzado a SALUDABLE o ATENCION: se respeta, pero con mensaje contextual.
            return new EstadoCalculado(
                    planta.getEstadoManual(),
                    mensajePorDias(planta, diasDesdeUltimoRiego, frecuencia),
                    diasDesdeUltimoRiego,
                    proximoCuidadoTexto
            );
        }

        if (frecuencia == null) {
            return new EstadoCalculado(EstadoSalud.SALUDABLE, mensajeSaludable(planta), diasDesdeUltimoRiego, proximoCuidadoTexto);
        }

        double ratio = diasDesdeUltimoRiego / (double) frecuencia;

        if (ratio <= 1.0) {
            return new EstadoCalculado(EstadoSalud.SALUDABLE, mensajeSaludable(planta), diasDesdeUltimoRiego, proximoCuidadoTexto);
        } else if (ratio <= 1.5) {
            return new EstadoCalculado(
                    EstadoSalud.ATENCION,
                    "Llevas %d días sin registrar un riego.".formatted(diasDesdeUltimoRiego),
                    diasDesdeUltimoRiego,
                    proximoCuidadoTexto
            );
        } else {
            return new EstadoCalculado(
                    EstadoSalud.PROBLEMAS,
                    "Necesita agua con cierta urgencia: han pasado %d días desde el último riego.".formatted(diasDesdeUltimoRiego),
                    diasDesdeUltimoRiego,
                    proximoCuidadoTexto
            );
        }
    }

    private String mensajePorDias(Planta planta, int diasDesdeUltimoRiego, Integer frecuencia) {
        if (frecuencia != null && diasDesdeUltimoRiego > frecuencia) {
            return "Llevas %d días sin registrar un riego.".formatted(diasDesdeUltimoRiego);
        }
        return mensajeSaludable(planta);
    }

    private String mensajeSaludable(Planta planta) {
        int indice = (int) Math.floorMod(planta.getId() + LocalDate.now().toEpochDay(), MENSAJES_SALUDABLE.size());
        return MENSAJES_SALUDABLE.get(indice);
    }

    private String calcularProximoCuidadoTexto(Planta planta, LocalDateTime ultimoRiego) {
        Integer frecuencia = planta.getFrecuenciaRiegoDias();
        if (frecuencia == null) {
            return "Sin calendario de riego definido";
        }

        LocalDate base = ultimoRiego != null
                ? ultimoRiego.toLocalDate()
                : (planta.getFechaAdopcion() != null ? planta.getFechaAdopcion() : LocalDate.now());

        LocalDate proxima = base.plusDays(frecuencia);
        long diff = ChronoUnit.DAYS.between(LocalDate.now(), proxima);

        if (diff == 0) {
            return "Riego hoy";
        } else if (diff == 1) {
            return "Riego mañana";
        } else if (diff > 1) {
            return "Riego en %d días".formatted(diff);
        } else {
            return "Riego atrasado %d días".formatted(-diff);
        }
    }
}
