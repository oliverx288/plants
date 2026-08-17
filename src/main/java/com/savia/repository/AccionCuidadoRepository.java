package com.savia.repository;

import com.savia.domain.AccionCuidado;
import com.savia.domain.TipoAccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AccionCuidadoRepository extends JpaRepository<AccionCuidado, Long> {

    List<AccionCuidado> findByPlantaIdOrderByFechaDesc(Long plantaId);

    List<AccionCuidado> findByPlantaIdAndTipoOrderByFechaAsc(Long plantaId, TipoAccion tipo);

    Optional<AccionCuidado> findFirstByPlantaIdAndTipoOrderByFechaDesc(Long plantaId, TipoAccion tipo);

    long countByPlantaIdAndTipo(Long plantaId, TipoAccion tipo);

    @Query(value = """
            SELECT date_trunc('month', fecha) AS mes, COUNT(*) AS total
            FROM acciones_cuidado
            WHERE planta_id = :plantaId
            GROUP BY mes
            ORDER BY mes
            """, nativeQuery = true)
    List<Object[]> contarPorMes(@Param("plantaId") Long plantaId);
}
