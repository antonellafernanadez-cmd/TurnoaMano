-- Historia 3. Para una base que YA tiene las tablas del sprint 2. Ejecutar UNA sola vez.
USE mi_turno_a_mano;

-- Los avisos de medicación no son de un turno.
ALTER TABLE notificaciones MODIFY turno_id INT NULL;
ALTER TABLE notificaciones MODIFY tipo
    ENUM('fecha_propuesta','recordatorio','cambio','medicacion') NOT NULL;

CREATE TABLE IF NOT EXISTS plan_medicacion (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id VARCHAR(20) NOT NULL,
    medicamento VARCHAR(80) NOT NULL,
    dosis       VARCHAR(60) NOT NULL,
    horario     CHAR(5)     NOT NULL,
    activo      TINYINT(1)  NOT NULL DEFAULT 1,
    creado_en   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paciente_activo (paciente_id, activo)
);
