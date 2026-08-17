CREATE TABLE usuarios (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    email           VARCHAR(180) NOT NULL UNIQUE,
    password_hash   VARCHAR(100) NOT NULL,
    creado_en       TIMESTAMP NOT NULL DEFAULT now()
);

-- Usuario de demostración, propietario de las plantas de ejemplo sembradas
-- en V2. Contraseña: savia2026
INSERT INTO usuarios (nombre, email, password_hash, creado_en) VALUES
    ('Demo Savia', 'demo@savia.app',
     '$2b$10$DHsBncAhA75UYee7S.mWPuyj0HNbOD31BpCkIJFone/ZoYeqQoD0i', now());

ALTER TABLE plantas ADD COLUMN usuario_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE;

UPDATE plantas SET usuario_id = (SELECT id FROM usuarios WHERE email = 'demo@savia.app')
WHERE usuario_id IS NULL;

ALTER TABLE plantas ALTER COLUMN usuario_id SET NOT NULL;

CREATE INDEX idx_plantas_usuario ON plantas (usuario_id);
