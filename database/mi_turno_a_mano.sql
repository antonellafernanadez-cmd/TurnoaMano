CREATE DATABASE IF NOT EXISTS mi_turno_a_mano CHARACTER SET utf8mb4;
USE mi_turno_a_mano;

-- La tabla usuarios la crea database/init_db.py (SQLAlchemy).
-- paciente_id y medico_id guardan el id del usuario (columna id de la tabla usuarios), como texto.
CREATE TABLE IF NOT EXISTS turnos (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id  VARCHAR(20)  NOT NULL,
    medico_id    VARCHAR(20)  NULL,
    especialidad VARCHAR(40)  NOT NULL,
    motivo       VARCHAR(300) NOT NULL DEFAULT '',
    origen       ENUM('manual','voz') NOT NULL,
    estado       ENUM('solicitado','propuesto','confirmado','rechazado','cancelado') NOT NULL DEFAULT 'solicitado',
    fecha_hora   DATETIME NULL,
    creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paciente (paciente_id),
    INDEX idx_medico_fecha (medico_id, fecha_hora),
    INDEX idx_estado (estado)
);

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
