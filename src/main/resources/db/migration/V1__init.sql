CREATE TABLE plantas (
    id                      BIGSERIAL PRIMARY KEY,
    slug                    VARCHAR(140) NOT NULL UNIQUE,
    nombre                  VARCHAR(120) NOT NULL,
    especie                 VARCHAR(160),
    descripcion             TEXT,
    fecha_adopcion          DATE,
    ubicacion               VARCHAR(160),
    luz_necesaria           VARCHAR(20),
    frecuencia_riego_dias   INTEGER,
    humedad_recomendada     VARCHAR(80),
    temperatura_min         NUMERIC(4,1),
    temperatura_max         NUMERIC(4,1),
    foto_principal_url      TEXT,
    estado_manual           VARCHAR(20),
    creado_en               TIMESTAMP NOT NULL DEFAULT now(),
    actualizado_en          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE acciones_cuidado (
    id                  BIGSERIAL PRIMARY KEY,
    planta_id           BIGINT NOT NULL REFERENCES plantas(id) ON DELETE CASCADE,
    tipo                VARCHAR(30) NOT NULL,
    fecha               TIMESTAMP NOT NULL,
    notas               TEXT,
    foto_url            TEXT,
    ubicacion_nueva     VARCHAR(160),
    creado_en           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_acciones_planta_fecha ON acciones_cuidado (planta_id, fecha DESC);
CREATE INDEX idx_acciones_planta_tipo ON acciones_cuidado (planta_id, tipo);
CREATE INDEX idx_plantas_slug ON plantas (slug);
