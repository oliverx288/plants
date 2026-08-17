package com.savia.service;

import com.savia.domain.AccionCuidado;
import com.savia.domain.Planta;
import com.savia.domain.TipoAccion;
import com.savia.domain.Usuario;
import com.savia.dto.PlantaDetalleDTO;
import com.savia.dto.PlantaGuardarDTO;
import com.savia.dto.PlantaResumenDTO;
import com.savia.exception.RecursoNoEncontradoException;
import com.savia.repository.AccionCuidadoRepository;
import com.savia.repository.PlantaRepository;
import com.savia.security.UsuarioActualProvider;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@Transactional(readOnly = true)
public class PlantaService {

    private final PlantaRepository plantaRepository;
    private final AccionCuidadoRepository accionCuidadoRepository;
    private final EstadoPlantaCalculator estadoPlantaCalculator;
    private final UsuarioActualProvider usuarioActualProvider;

    public PlantaService(PlantaRepository plantaRepository,
                          AccionCuidadoRepository accionCuidadoRepository,
                          EstadoPlantaCalculator estadoPlantaCalculator,
                          UsuarioActualProvider usuarioActualProvider) {
        this.plantaRepository = plantaRepository;
        this.accionCuidadoRepository = accionCuidadoRepository;
        this.estadoPlantaCalculator = estadoPlantaCalculator;
        this.usuarioActualProvider = usuarioActualProvider;
    }

    public List<PlantaResumenDTO> listarResumen() {
        Usuario usuario = usuarioActualProvider.requerir();
        return plantaRepository.findByUsuarioIdOrderByNombreAsc(usuario.getId()).stream()
                .map(this::aResumen)
                .toList();
    }

    public PlantaDetalleDTO obtenerDetalle(String slug, String origenUrl) {
        Planta planta = buscarPorSlug(slug);
        return aDetalle(planta, origenUrl);
    }

    @Transactional
    public PlantaDetalleDTO crear(PlantaGuardarDTO dto, String origenUrl) {
        Usuario usuario = usuarioActualProvider.requerir();
        Planta planta = new Planta();
        planta.setUsuario(usuario);
        aplicarCambios(planta, dto);
        planta.setSlug(generarSlugUnico(dto.getNombre()));
        planta = plantaRepository.save(planta);
        return aDetalle(planta, origenUrl);
    }

    @Transactional
    public PlantaDetalleDTO actualizar(String slug, PlantaGuardarDTO dto, String origenUrl) {
        Planta planta = buscarPorSlug(slug);
        exigirPropietario(planta);
        aplicarCambios(planta, dto);
        planta = plantaRepository.save(planta);
        return aDetalle(planta, origenUrl);
    }

    @Transactional
    public void eliminar(String slug) {
        Planta planta = buscarPorSlug(slug);
        exigirPropietario(planta);
        plantaRepository.delete(planta);
    }

    Planta buscarPorSlug(String slug) {
        return plantaRepository.findBySlug(slug)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe ninguna planta con el identificador '%s'".formatted(slug)));
    }

    void exigirPropietario(Planta planta) {
        Usuario usuario = usuarioActualProvider.requerir();
        if (!planta.getUsuario().getId().equals(usuario.getId())) {
            throw new AccessDeniedException("Esta planta no te pertenece");
        }
    }

    private PlantaResumenDTO aResumen(Planta planta) {
        Optional<AccionCuidado> ultimoRiego = accionCuidadoRepository
                .findFirstByPlantaIdAndTipoOrderByFechaDesc(planta.getId(), TipoAccion.RIEGO);

        EstadoCalculado calculado = estadoPlantaCalculator.calcular(
                planta,
                ultimoRiego.map(AccionCuidado::getFecha).orElse(null)
        );

        return new PlantaResumenDTO(
                planta.getId(),
                planta.getSlug(),
                planta.getNombre(),
                planta.getEspecie(),
                planta.getFotoPrincipalUrl(),
                calculado.estado(),
                calculado.mensaje(),
                ultimoRiego.map(a -> a.getFecha().toLocalDate()).orElse(null),
                calculado.diasDesdeUltimoRiego(),
                calculado.proximoCuidadoTexto()
        );
    }

    private PlantaDetalleDTO aDetalle(Planta planta, String origenUrl) {
        Optional<AccionCuidado> ultimoRiego = accionCuidadoRepository
                .findFirstByPlantaIdAndTipoOrderByFechaDesc(planta.getId(), TipoAccion.RIEGO);

        EstadoCalculado calculado = estadoPlantaCalculator.calcular(
                planta,
                ultimoRiego.map(AccionCuidado::getFecha).orElse(null)
        );

        String urlNfc = (origenUrl == null ? "" : origenUrl) + "/plantas/" + planta.getSlug();

        boolean esPropia = usuarioActualProvider.obtener()
                .map(u -> u.getId().equals(planta.getUsuario().getId()))
                .orElse(false);

        return new PlantaDetalleDTO(
                planta.getId(),
                planta.getSlug(),
                planta.getNombre(),
                planta.getEspecie(),
                planta.getDescripcion(),
                planta.getFechaAdopcion(),
                planta.getUbicacion(),
                planta.getLuzNecesaria(),
                planta.getFrecuenciaRiegoDias(),
                planta.getHumedadRecomendada(),
                planta.getTemperaturaMin(),
                planta.getTemperaturaMax(),
                planta.getFotoPrincipalUrl(),
                planta.getEstadoManual(),
                calculado.estado(),
                calculado.mensaje(),
                calculado.diasDesdeUltimoRiego(),
                calculado.proximoCuidadoTexto(),
                urlNfc,
                esPropia
        );
    }

    private void aplicarCambios(Planta planta, PlantaGuardarDTO dto) {
        planta.setNombre(dto.getNombre().trim());
        planta.setEspecie(dto.getEspecie());
        planta.setDescripcion(dto.getDescripcion());
        planta.setFechaAdopcion(dto.getFechaAdopcion());
        planta.setUbicacion(dto.getUbicacion());
        planta.setLuzNecesaria(dto.getLuzNecesaria());
        planta.setFrecuenciaRiegoDias(dto.getFrecuenciaRiegoDias());
        planta.setHumedadRecomendada(dto.getHumedadRecomendada());
        planta.setTemperaturaMin(dto.getTemperaturaMin());
        planta.setTemperaturaMax(dto.getTemperaturaMax());
        planta.setFotoPrincipalUrl(dto.getFotoPrincipalUrl());
        planta.setEstadoManual(dto.getEstadoManual());
    }

    private static final Pattern CARACTERES_NO_VALIDOS = Pattern.compile("[^a-z0-9]+");

    private String generarSlugUnico(String nombre) {
        String base = slugificar(nombre);
        if (base.isBlank()) {
            base = "planta";
        }
        String candidato = base;
        int sufijo = 2;
        while (plantaRepository.existsBySlug(candidato)) {
            candidato = base + "-" + sufijo;
            sufijo++;
        }
        return candidato;
    }

    private String slugificar(String texto) {
        String normalizado = Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String minusculas = normalizado.toLowerCase();
        String conGuiones = CARACTERES_NO_VALIDOS.matcher(minusculas).replaceAll("-");
        return conGuiones.replaceAll("^-+|-+$", "");
    }
}
