CREATE DATABASE IF NOT EXISTS mi_turno_a_mano CHARACTER SET utf8mb4;
USE mi_turno_a_mano;

-- paciente_id guarda el DNI (id del usuario en el token).
-- Cuando exista la tabla de usuarios de tu compañera, agregar:
--   FOREIGN KEY (paciente_id) REFERENCES usuarios(...)
CREATE TABLE IF NOT EXISTS turnos (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id  VARCHAR(20)  NOT NULL,
    especialidad VARCHAR(40)  NOT NULL,
    motivo       VARCHAR(300) NOT NULL DEFAULT '',
    origen       ENUM('manual','voz') NOT NULL,
    estado       ENUM('solicitado','propuesto','confirmado','rechazado') NOT NULL DEFAULT 'solicitado',
    fecha_hora   DATETIME NULL,
    creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_paciente (paciente_id),
    INDEX idx_estado (estado)
);
