-- Para una base que YA tiene la tabla turnos del sprint 1. Ejecutar UNA sola vez.
USE mi_turno_a_mano;

ALTER TABLE turnos ADD COLUMN medico_id VARCHAR(20) NULL AFTER paciente_id;
ALTER TABLE turnos MODIFY estado
    ENUM('solicitado','propuesto','confirmado','rechazado','cancelado') NOT NULL DEFAULT 'solicitado';
CREATE INDEX idx_medico_fecha ON turnos (medico_id, fecha_hora);

CREATE TABLE IF NOT EXISTS notificaciones (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id VARCHAR(20)  NOT NULL,
    turno_id    INT          NOT NULL,
    tipo        ENUM('fecha_propuesta','recordatorio','cambio') NOT NULL,
    mensaje     VARCHAR(500) NOT NULL,
    leida       TINYINT(1)   NOT NULL DEFAULT 0,
    creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paciente_leida (paciente_id, leida)
);
