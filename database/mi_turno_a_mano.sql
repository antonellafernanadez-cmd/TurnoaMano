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
    turno_id    INT          NULL,          -- NULL en avisos que no son de un turno (medicación)
    tipo        ENUM('fecha_propuesta','recordatorio','cambio','medicacion') NOT NULL,
    mensaje     VARCHAR(500) NOT NULL,
    leida       TINYINT(1)   NOT NULL DEFAULT 0,
    creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paciente_leida (paciente_id, leida)
);

-- Historia 3: una fila por toma (un medicamento, su dosis y el horario).
-- Lo escribe la historia 5 (el médico carga el plan); acá solo se consulta y se avisa.
CREATE TABLE IF NOT EXISTS plan_medicacion (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id VARCHAR(20) NOT NULL,
    medicamento VARCHAR(80) NOT NULL,
    dosis       VARCHAR(60) NOT NULL,
    horario     CHAR(5)     NOT NULL,           -- 'HH:MM'
    activo      TINYINT(1)  NOT NULL DEFAULT 1,
    creado_en   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paciente_activo (paciente_id, activo)
);
