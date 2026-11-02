-- Mi Turno a Mano - base de datos (MySQL)
-- La tabla usuarios se crea mediante database/init_db.py (SQLAlchemy).
-- Los turnos y las notificaciones se crean desde este archivo.
--
-- Ejecutar:
-- mysql -u root -p < database/mi_turno_a_mano.sql

DROP DATABASE IF EXISTS mi_turno_a_mano;

CREATE DATABASE mi_turno_a_mano
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE mi_turno_a_mano;


-- =====================================================
-- TABLA: TURNOS
-- paciente_id y medico_id guardan el ID del usuario
-- correspondiente a la tabla usuarios, como texto.
-- =====================================================

CREATE TABLE IF NOT EXISTS turnos (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id  VARCHAR(20)  NOT NULL,
    medico_id    VARCHAR(20)  NULL,
    especialidad VARCHAR(40)  NOT NULL,
    motivo       VARCHAR(300) NOT NULL DEFAULT '',
    origen       ENUM('manual', 'voz') NOT NULL,
    estado       ENUM(
        'solicitado',
        'propuesto',
        'confirmado',
        'rechazado',
        'cancelado'
    ) NOT NULL DEFAULT 'solicitado',
    fecha_hora   DATETIME NULL,
    creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_paciente (paciente_id),
    INDEX idx_medico_fecha (medico_id, fecha_hora),
    INDEX idx_estado (estado)
) ENGINE=InnoDB;


-- =====================================================
-- TABLA: NOTIFICACIONES
-- Almacena los avisos enviados a los pacientes.
-- =====================================================

CREATE TABLE IF NOT EXISTS notificaciones (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id VARCHAR(20)  NOT NULL,
    turno_id    INT          NULL,
    tipo        ENUM(
        'fecha_propuesta',
        'recordatorio',
        'cambio',
        'confirmacion',
        "medicacion"
    ) NOT NULL,
    mensaje     VARCHAR(500) NOT NULL,
    leida       TINYINT(1) NOT NULL DEFAULT 0,
    creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_paciente_leida (paciente_id, leida),
    INDEX idx_turno (turno_id),

    CONSTRAINT fk_notif_turno
        FOREIGN KEY (turno_id)
        REFERENCES turnos(id)
) ENGINE=InnoDB;


-- Sprint 2 HU3/HU5
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

CREATE TABLE IF NOT EXISTS recetas (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id   VARCHAR(20)  NOT NULL,
    medico_id     VARCHAR(20)  NOT NULL,
    indicaciones  VARCHAR(500) NOT NULL DEFAULT '',
    activa        TINYINT(1)   NOT NULL DEFAULT 1,
    creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recetas_paciente (paciente_id),
    INDEX idx_recetas_medico (medico_id)
);

CREATE TABLE IF NOT EXISTS receta_items (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    receta_id     INT          NOT NULL,
    medicamento   VARCHAR(80)  NOT NULL,
    dosis         VARCHAR(60)  NOT NULL,
    horario       CHAR(5)      NOT NULL,
    CONSTRAINT fk_receta_items_receta FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE
);
