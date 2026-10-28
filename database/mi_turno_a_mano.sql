-- Mi Turno a Mano - base de datos (MySQL)
-- Ejecutar completo: crea la base desde cero con las tablas y los usuarios por defecto.
--   mysql -u root -p < database/mi_turno_a_mano.sql
-- Igual que en el proyecto de farmacia: el administrativo y el médico ya vienen cargados.
-- Solo el paciente (adulto mayor) se registra desde la app.
DROP DATABASE IF EXISTS mi_turno_a_mano;
CREATE DATABASE mi_turno_a_mano
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mi_turno_a_mano;

-- identificador = DNI (paciente), matrícula (médico) o legajo (administrativo).
CREATE TABLE usuarios (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(100) NOT NULL,
  telefono          VARCHAR(30)  NOT NULL,
  email             VARCHAR(120) NOT NULL UNIQUE,
  identificador     VARCHAR(20)  NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  rol               ENUM('paciente','medico','administrativo') NOT NULL,
  intentos_fallidos INT NOT NULL DEFAULT 0,
  bloqueado_hasta   DATETIME NULL,
  creado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- paciente_id guarda el DNI del paciente.
-- La clave foránea hacia usuarios se agrega en el paso 5, cuando el token del login use el DNI.
CREATE TABLE turnos (
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
) ENGINE=InnoDB;

-- Usuarios por defecto (datos ficticios).
--   Administrativo: legajo 1001      contraseña admin12345
--   Médico:         matrícula 2001   contraseña medico12345
INSERT INTO usuarios (nombre, telefono, email, identificador, password_hash, rol) VALUES
  ('Admin Prueba',  '2610000001', 'admin@miturnoamano.com',  '1001',
   'scrypt:32768:8:1$PTMdxVFfVru97vPI$8f1248309c2e7ece9eb7ffd8f8874778419cc7f7de971f25e8f3022083d3c3ec2057ab8d65e859ed20e92fb6e283ab1495329b16963c08246ecd81b8d5dfc4e6', 'administrativo'),
  ('Médico Prueba', '2610000002', 'medico@miturnoamano.com', '2001',
   'scrypt:32768:8:1$tl1mQ2xC2VWkCXZp$c3ad7274eb1ac83aa0cdca525cbb39feb50ddbefd720ea4b2828b22bac4aaca617fe633dec1f9d49bb0a48c57b7e4bde830594161067f55968bb7918a55e1760', 'medico');