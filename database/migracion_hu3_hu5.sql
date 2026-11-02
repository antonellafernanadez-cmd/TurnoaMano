-- Sprint 2: plan de medicación + recetas digitales + tipo medicacion en notificaciones
USE mi_turno_a_mano;

ALTER TABLE notificaciones MODIFY turno_id INT NULL;
ALTER TABLE notificaciones MODIFY tipo
    ENUM('fecha_propuesta','recordatorio','cambio','confirmacion','medicacion') NOT NULL;

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
    CONSTRAINT fk_receta_items_receta FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
    INDEX idx_receta_items_receta (receta_id)
);
