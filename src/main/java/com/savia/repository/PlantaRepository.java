package com.savia.repository;

import com.savia.domain.Planta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlantaRepository extends JpaRepository<Planta, Long> {

    Optional<Planta> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Planta> findAllByOrderByNombreAsc();
}
