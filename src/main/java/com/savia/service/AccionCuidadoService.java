package com.savia.service;

import com.savia.domain.AccionCuidado;
import com.savia.domain.Planta;
import com.savia.domain.TipoAccion;
import com.savia.dto.AccionCuidadoDTO;
import com.savia.dto.AccionCuidadoGuardarDTO;
import com.savia.dto.EstadisticasDTO;
import com.savia.repository.AccionCuidadoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class AccionCuidadoService {

    private final AccionCuidadoRepository accionCuidadoRepository;
    private final PlantaService plantaService;

    public AccionCuidadoService(AccionCuidadoRepository accionCuidadoRepository, PlantaService plantaService) {
        this.accionCuidadoRepository = accionCuidadoRepository;
        this.plantaService = plantaService;
    }

    public List<AccionCuidadoDTO> listarHistorial(String slug) {
        Planta planta = plantaService.buscarPorSlug(slug);
        return accionCuidadoRepository.findByPlantaIdOrderByFechaDesc(planta.getId()).stream()
                .map(this::aDTO)
                .toList();
    }

    public List<AccionCuidadoDTO> listarDiario(String slug) {
        Planta planta = plantaService.buscarPorSlug(slug);
        return accionCuidadoRepository.findByPlantaIdAndTipoOrderByFechaAsc(planta.getId(), TipoAccion.FOTO).stream()
                .map(this::aDTO)
                .toList();
    }

    @Transactional
    public AccionCuidadoDTO registrar(String slug, AccionCuidadoGuardarDTO dto) {
        Planta planta = plantaService.buscarPorSlug(slug);
        plantaService.exigirPropietario(planta);

        AccionCuidado accion = AccionCuidado.builder()
                .planta(planta)
                .tipo(dto.getTipo())
                .fecha(dto.getFecha() != null ? dto.getFecha() : LocalDateTime.now())
                .notas(dto.getNotas())
                .fotoUrl(dto.getFotoUrl())
                .ubicacionNueva(dto.getUbicacionNueva())
                .build();

        return aDTO(accionCuidadoRepository.save(accion));
    }

    public EstadisticasDTO estadisticas(String slug) {
        Planta planta = plantaService.buscarPorSlug(slug);
        Long plantaId = planta.getId();

        long riegos = accionCuidadoRepository.countByPlantaIdAndTipo(plantaId, TipoAccion.RIEGO);
        long abonados = accionCuidadoRepository.countByPlantaIdAndTipo(plantaId, TipoAccion.ABONADO);
        long podas = accionCuidadoRepository.countByPlantaIdAndTipo(plantaId, TipoAccion.PODA);
        long trasplantes = accionCuidadoRepository.countByPlantaIdAndTipo(plantaId, TipoAccion.TRASPLANTE);
        long fotografias = accionCuidadoRepository.countByPlantaIdAndTipo(plantaId, TipoAccion.FOTO);

        Integer diasDesdeUltimoRiego = accionCuidadoRepository
                .findFirstByPlantaIdAndTipoOrderByFechaDesc(plantaId, TipoAccion.RIEGO)
                .map(a -> (int) java.time.temporal.ChronoUnit.DAYS.between(a.getFecha().toLocalDate(), java.time.LocalDate.now()))
                .orElse(null);

        List<EstadisticasDTO.EvolucionMensualDTO> evolucion = accionCuidadoRepository.contarPorMes(plantaId).stream()
                .map(fila -> {
                    Timestamp timestamp = (Timestamp) fila[0];
                    long total = ((Number) fila[1]).longValue();
                    YearMonth mes = YearMonth.from(timestamp.toLocalDateTime());
                    String etiqueta = capitalizar(mes.getMonth().getDisplayName(TextStyle.SHORT, new Locale("es", "ES")))
                            + " " + mes.getYear();
                    return new EstadisticasDTO.EvolucionMensualDTO(etiqueta, total);
                })
                .toList();

        return new EstadisticasDTO(riegos, abonados, podas, trasplantes, fotografias, diasDesdeUltimoRiego, evolucion);
    }

    private String capitalizar(String texto) {
        if (texto == null || texto.isEmpty()) {
            return texto;
        }
        return texto.substring(0, 1).toUpperCase(Locale.ROOT) + texto.substring(1);
    }

    private AccionCuidadoDTO aDTO(AccionCuidado accion) {
        return new AccionCuidadoDTO(
                accion.getId(),
                accion.getTipo(),
                accion.getFecha(),
                accion.getNotas(),
                accion.getFotoUrl(),
                accion.getUbicacionNueva()
        );
    }
}
