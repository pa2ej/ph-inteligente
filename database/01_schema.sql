-- ================================================================
--  PH INTELIGENTE — Schema SQL Server completo
--  Compatible: SQL Server 2019+ / Azure SQL Database
--  Ejecucion: sqlcmd -S SERVIDOR -U sa -P Password -i 01_schema.sql
-- ================================================================

USE master;
GO
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ph_inteligente')
    CREATE DATABASE ph_inteligente COLLATE Latin1_General_CI_AI;
GO
USE ph_inteligente;
GO

-- ═══════════════════════════════════════════════════════
--  1. COPROPIEDAD
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='copropiedades')
CREATE TABLE copropiedades (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    nombre          NVARCHAR(120) NOT NULL,
    nit             NVARCHAR(20)  NULL,
    direccion       NVARCHAR(200) NULL,
    ciudad          NVARCHAR(80)  NULL,
    departamento    NVARCHAR(80)  NULL,
    telefono        NVARCHAR(20)  NULL,
    email           NVARCHAR(100) NULL,
    representante   NVARCHAR(120) NULL,
    logo_url        NVARCHAR(MAX) NULL,
    activa          BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT GETDATE(),
    updated_at      DATETIME2 DEFAULT GETDATE()
);
GO

-- ═══════════════════════════════════════════════════════
--  2. USUARIOS Y ROLES
--  Roles validos: super_admin, administrador, contador,
--                 portero, propietario, residente
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='usuarios')
CREATE TABLE usuarios (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id      INT NOT NULL,
    nombre_completo     NVARCHAR(120) NOT NULL,
    email               NVARCHAR(100) NOT NULL,
    password_hash       NVARCHAR(MAX) NOT NULL,   -- bcrypt
    cargo               NVARCHAR(80)  NULL,
    rol                 NVARCHAR(30)  NOT NULL DEFAULT 'administrador',
    activo              BIT DEFAULT 1,
    ultimo_acceso       DATETIME2 NULL,
    token_reset         NVARCHAR(MAX) NULL,
    token_reset_exp     DATETIME2 NULL,
    persona_id          INT NULL,                 -- vinculo con propietario
    created_at          DATETIME2 DEFAULT GETDATE(),
    updated_at          DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_usuarios_email UNIQUE (email),
    CONSTRAINT FK_usuarios_copropiedad FOREIGN KEY (copropiedad_id)
        REFERENCES copropiedades(id) ON DELETE CASCADE,
    CONSTRAINT CK_usuarios_rol CHECK (rol IN (
        'super_admin','administrador','contador','portero','propietario','residente'
    ))
);
GO
CREATE INDEX IX_usuarios_email       ON usuarios(email);
CREATE INDEX IX_usuarios_copropiedad ON usuarios(copropiedad_id);
GO

-- ═══════════════════════════════════════════════════════
--  3. TORRES Y UNIDADES
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='torres')
CREATE TABLE torres (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id  INT NOT NULL,
    nombre          NVARCHAR(60) NOT NULL,
    pisos           SMALLINT DEFAULT 1,
    activa          BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_torres_copropiedad FOREIGN KEY (copropiedad_id)
        REFERENCES copropiedades(id) ON DELETE CASCADE
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='unidades')
CREATE TABLE unidades (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id  INT NOT NULL,
    torre_id        INT NULL,
    numero          NVARCHAR(20) NOT NULL,
    piso            SMALLINT NULL,
    tipo            NVARCHAR(30) NOT NULL DEFAULT 'apartamento',
    area_m2         DECIMAL(8,2) NULL,
    coeficiente     DECIMAL(10,6) NULL,           -- ej: 0.024500 = 2.45%
    activa          BIT DEFAULT 1,
    observaciones   NVARCHAR(MAX) NULL,
    created_at      DATETIME2 DEFAULT GETDATE(),
    updated_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_unidades_num UNIQUE (copropiedad_id, numero),
    CONSTRAINT FK_unidades_copropiedad FOREIGN KEY (copropiedad_id)
        REFERENCES copropiedades(id),
    CONSTRAINT FK_unidades_torre FOREIGN KEY (torre_id)
        REFERENCES torres(id),
    CONSTRAINT CK_unidades_tipo CHECK (tipo IN (
        'apartamento','casa','local_comercial','oficina',
        'parqueadero','bodega','penthouse','otro'
    ))
);
GO
CREATE INDEX IX_unidades_copropiedad ON unidades(copropiedad_id);
GO

-- ═══════════════════════════════════════════════════════
--  4. PERSONAS — Propietarios / Residentes / Arrendatarios
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='personas')
CREATE TABLE personas (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    tipo_doc        NVARCHAR(5)   NOT NULL DEFAULT 'CC',
    num_doc         NVARCHAR(20)  NOT NULL,
    nombre          NVARCHAR(60)  NOT NULL,
    apellido        NVARCHAR(60)  NOT NULL,
    telefono        NVARCHAR(20)  NULL,
    telefono2       NVARCHAR(20)  NULL,
    email           NVARCHAR(100) NULL,
    direccion       NVARCHAR(MAX) NULL,
    activa          BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT GETDATE(),
    updated_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_personas_doc UNIQUE (tipo_doc, num_doc),
    CONSTRAINT CK_personas_tipo_doc CHECK (tipo_doc IN ('CC','CE','NIT','PP','TI','DE'))
);
GO
CREATE INDEX IX_personas_num_doc ON personas(num_doc);
GO

-- Ocupaciones: relacion M:N personas <-> unidades
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='ocupaciones')
CREATE TABLE ocupaciones (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    unidad_id       INT NOT NULL,
    persona_id      INT NOT NULL,
    rol             NVARCHAR(20) NOT NULL DEFAULT 'propietario',
    fecha_inicio    DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    fecha_fin       DATE NULL,
    es_contacto     BIT DEFAULT 1,
    activa          BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_ocup_unidad  FOREIGN KEY (unidad_id)  REFERENCES unidades(id)  ON DELETE CASCADE,
    CONSTRAINT FK_ocup_persona FOREIGN KEY (persona_id) REFERENCES personas(id)  ON DELETE CASCADE,
    CONSTRAINT CK_ocup_rol CHECK (rol IN ('propietario','arrendatario','cohabitante','empresa'))
);
GO
CREATE INDEX IX_ocupaciones_unidad  ON ocupaciones(unidad_id);
CREATE INDEX IX_ocupaciones_persona ON ocupaciones(persona_id);
GO

ALTER TABLE usuarios
    ADD CONSTRAINT FK_usuarios_persona FOREIGN KEY (persona_id) REFERENCES personas(id);
GO

-- ═══════════════════════════════════════════════════════
--  5. FACTURACION
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='facturas')
CREATE TABLE facturas (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id      INT NOT NULL,
    unidad_id           INT NOT NULL,
    periodo_anio        SMALLINT NOT NULL,
    periodo_mes         SMALLINT NOT NULL,
    fecha_emision       DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    fecha_vencimiento   DATE NOT NULL,
    valor_admin         DECIMAL(14,2) NOT NULL DEFAULT 0,
    valor_extra         DECIMAL(14,2) NOT NULL DEFAULT 0,   -- cuotas extraordinarias
    valor_mora          DECIMAL(14,2) NOT NULL DEFAULT 0,
    descuento           DECIMAL(14,2) NOT NULL DEFAULT 0,
    -- Columna computada persistida: no requiere UPDATE manual
    total AS (valor_admin + valor_extra + valor_mora - descuento) PERSISTED,
    estado              NVARCHAR(15) NOT NULL DEFAULT 'pendiente',
    notas               NVARCHAR(MAX) NULL,
    generada_por        INT NULL,
    anulada_por         INT NULL,
    anulada_en          DATETIME2 NULL,
    motivo_anulacion    NVARCHAR(MAX) NULL,
    created_at          DATETIME2 DEFAULT GETDATE(),
    updated_at          DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_facturas_periodo  UNIQUE (unidad_id, periodo_anio, periodo_mes),
    CONSTRAINT FK_fact_copropiedad  FOREIGN KEY (copropiedad_id) REFERENCES copropiedades(id),
    CONSTRAINT FK_fact_unidad       FOREIGN KEY (unidad_id)      REFERENCES unidades(id),
    CONSTRAINT FK_fact_generada_por FOREIGN KEY (generada_por)   REFERENCES usuarios(id),
    CONSTRAINT FK_fact_anulada_por  FOREIGN KEY (anulada_por)    REFERENCES usuarios(id),
    CONSTRAINT CK_facturas_estado   CHECK (estado IN ('pendiente','pagada','parcial','vencida','anulada')),
    CONSTRAINT CK_facturas_mes      CHECK (periodo_mes BETWEEN 1 AND 12)
);
GO
CREATE INDEX IX_facturas_unidad      ON facturas(unidad_id);
CREATE INDEX IX_facturas_copropiedad ON facturas(copropiedad_id);
CREATE INDEX IX_facturas_periodo     ON facturas(periodo_anio, periodo_mes);
CREATE INDEX IX_facturas_estado      ON facturas(estado);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='factura_conceptos')
CREATE TABLE factura_conceptos (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    factura_id  INT NOT NULL,
    concepto    NVARCHAR(120) NOT NULL,
    valor       DECIMAL(14,2) NOT NULL,
    created_at  DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_fconc_factura FOREIGN KEY (factura_id)
        REFERENCES facturas(id) ON DELETE CASCADE
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='generaciones_facturacion')
CREATE TABLE generaciones_facturacion (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id  INT NOT NULL,
    periodo_anio    SMALLINT NOT NULL,
    periodo_mes     SMALLINT NOT NULL,
    metodo          NVARCHAR(15) NOT NULL,
    valor_base      DECIMAL(14,2) NOT NULL,
    total_unidades  INT NOT NULL,
    total_generadas INT NOT NULL,
    total_omitidas  INT DEFAULT 0,
    generado_por    INT NULL,
    created_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_gen_copropiedad FOREIGN KEY (copropiedad_id) REFERENCES copropiedades(id),
    CONSTRAINT FK_gen_usuario     FOREIGN KEY (generado_por)   REFERENCES usuarios(id)
);
GO

-- ═══════════════════════════════════════════════════════
--  6. PAGOS / RECAUDOS
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='pagos')
CREATE TABLE pagos (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id  INT NOT NULL,
    factura_id      INT NULL,                     -- puede ser abono sin factura
    unidad_id       INT NOT NULL,
    fecha_pago      DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    monto           DECIMAL(14,2) NOT NULL,
    metodo          NVARCHAR(20) NOT NULL DEFAULT 'efectivo',
    referencia      NVARCHAR(100) NULL,
    banco           NVARCHAR(80)  NULL,
    estado          NVARCHAR(15) NOT NULL DEFAULT 'registrado',
    notas           NVARCHAR(MAX) NULL,
    registrado_por  INT NULL,
    verificado_por  INT NULL,
    verificado_en   DATETIME2 NULL,
    created_at      DATETIME2 DEFAULT GETDATE(),
    updated_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_pagos_copropiedad    FOREIGN KEY (copropiedad_id) REFERENCES copropiedades(id),
    CONSTRAINT FK_pagos_factura        FOREIGN KEY (factura_id)     REFERENCES facturas(id),
    CONSTRAINT FK_pagos_unidad         FOREIGN KEY (unidad_id)      REFERENCES unidades(id),
    CONSTRAINT FK_pagos_registrado_por FOREIGN KEY (registrado_por) REFERENCES usuarios(id),
    CONSTRAINT FK_pagos_verificado_por FOREIGN KEY (verificado_por) REFERENCES usuarios(id),
    CONSTRAINT CK_pagos_monto  CHECK (monto > 0),
    CONSTRAINT CK_pagos_metodo CHECK (metodo IN (
        'efectivo','transferencia','pse','cheque','tarjeta_credito','tarjeta_debito','otro'
    )),
    CONSTRAINT CK_pagos_estado CHECK (estado IN ('registrado','verificado','rechazado','reversado'))
);
GO
CREATE INDEX IX_pagos_factura ON pagos(factura_id);
CREATE INDEX IX_pagos_unidad  ON pagos(unidad_id);
CREATE INDEX IX_pagos_fecha   ON pagos(fecha_pago);
GO

-- ═══════════════════════════════════════════════════════
--  7. PQR / CORRESPONDENCIA
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='pqr')
CREATE TABLE pqr (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id  INT NOT NULL,
    tipo            NVARCHAR(30) NOT NULL,
    asunto          NVARCHAR(200) NOT NULL,
    descripcion     NVARCHAR(MAX) NOT NULL,
    unidad_id       INT NULL,
    persona_id      INT NULL,
    anonimo         BIT DEFAULT 0,
    estado          NVARCHAR(20) NOT NULL DEFAULT 'recibido',
    prioridad       SMALLINT NOT NULL DEFAULT 2,   -- 1=alta 2=media 3=baja
    fecha_limite    DATE NULL,
    asignado_a      INT NULL,
    respuesta       NVARCHAR(MAX) NULL,
    respondido_por  INT NULL,
    respondido_en   DATETIME2 NULL,
    created_at      DATETIME2 DEFAULT GETDATE(),
    updated_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_pqr_copropiedad FOREIGN KEY (copropiedad_id) REFERENCES copropiedades(id),
    CONSTRAINT FK_pqr_unidad      FOREIGN KEY (unidad_id)      REFERENCES unidades(id),
    CONSTRAINT FK_pqr_persona     FOREIGN KEY (persona_id)     REFERENCES personas(id),
    CONSTRAINT FK_pqr_asignado    FOREIGN KEY (asignado_a)     REFERENCES usuarios(id),
    CONSTRAINT FK_pqr_respondido  FOREIGN KEY (respondido_por) REFERENCES usuarios(id),
    CONSTRAINT CK_pqr_tipo CHECK (tipo IN (
        'peticion','queja','reclamo','sugerencia','felicitacion',
        'correspondencia_entrada','correspondencia_salida'
    )),
    CONSTRAINT CK_pqr_estado    CHECK (estado IN ('recibido','en_tramite','respondido','cerrado','archivado')),
    CONSTRAINT CK_pqr_prioridad CHECK (prioridad BETWEEN 1 AND 3)
);
GO
CREATE INDEX IX_pqr_copropiedad ON pqr(copropiedad_id);
CREATE INDEX IX_pqr_estado      ON pqr(estado);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='adjuntos')
CREATE TABLE adjuntos (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    entidad     NVARCHAR(30) NOT NULL,       -- 'pqr' | 'pago' | 'factura'
    entidad_id  INT NOT NULL,
    nombre      NVARCHAR(200) NOT NULL,
    url         NVARCHAR(MAX) NOT NULL,
    mime_type   NVARCHAR(80) NULL,
    tamanio_kb  INT NULL,
    subido_por  INT NULL,
    created_at  DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_adjuntos_usuario FOREIGN KEY (subido_por) REFERENCES usuarios(id)
);
GO

-- ═══════════════════════════════════════════════════════
--  8. AREAS COMUNES Y RESERVAS
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='areas_comunes')
CREATE TABLE areas_comunes (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id      INT NOT NULL,
    nombre              NVARCHAR(80) NOT NULL,
    descripcion         NVARCHAR(MAX) NULL,
    capacidad           SMALLINT NULL,
    valor_reserva       DECIMAL(10,2) DEFAULT 0,
    requiere_deposito   BIT DEFAULT 0,
    valor_deposito      DECIMAL(10,2) DEFAULT 0,
    activa              BIT DEFAULT 1,
    created_at          DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_areas_copropiedad FOREIGN KEY (copropiedad_id) REFERENCES copropiedades(id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='reservas')
CREATE TABLE reservas (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    area_id         INT NOT NULL,
    unidad_id       INT NOT NULL,
    persona_id      INT NULL,
    fecha_inicio    DATETIME2 NOT NULL,
    fecha_fin       DATETIME2 NOT NULL,
    estado          NVARCHAR(15) NOT NULL DEFAULT 'solicitada',
    motivo          NVARCHAR(200) NULL,
    asistentes      SMALLINT NULL,
    valor_cobrado   DECIMAL(10,2) DEFAULT 0,
    deposito_pagado BIT DEFAULT 0,
    aprobado_por    INT NULL,
    notas           NVARCHAR(MAX) NULL,
    created_at      DATETIME2 DEFAULT GETDATE(),
    updated_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_res_area     FOREIGN KEY (area_id)      REFERENCES areas_comunes(id),
    CONSTRAINT FK_res_unidad   FOREIGN KEY (unidad_id)    REFERENCES unidades(id),
    CONSTRAINT FK_res_persona  FOREIGN KEY (persona_id)   REFERENCES personas(id),
    CONSTRAINT FK_res_aprobado FOREIGN KEY (aprobado_por) REFERENCES usuarios(id),
    CONSTRAINT CK_res_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT CK_res_estado  CHECK (estado IN ('solicitada','aprobada','rechazada','cancelada','completada'))
);
GO
CREATE INDEX IX_reservas_area  ON reservas(area_id);
CREATE INDEX IX_reservas_fecha ON reservas(fecha_inicio, fecha_fin);
GO

-- ═══════════════════════════════════════════════════════
--  9. PROVEEDORES Y MANTENIMIENTOS
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='proveedores')
CREATE TABLE proveedores (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id  INT NOT NULL,
    razon_social    NVARCHAR(120) NOT NULL,
    nit             NVARCHAR(20)  NULL,
    contacto        NVARCHAR(80)  NULL,
    telefono        NVARCHAR(20)  NULL,
    email           NVARCHAR(100) NULL,
    especialidad    NVARCHAR(80)  NULL,
    activo          BIT DEFAULT 1,
    created_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_prov_copropiedad FOREIGN KEY (copropiedad_id) REFERENCES copropiedades(id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='mantenimientos')
CREATE TABLE mantenimientos (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id      INT NOT NULL,
    proveedor_id        INT NULL,
    descripcion         NVARCHAR(MAX) NOT NULL,
    area                NVARCHAR(80) NULL,
    fecha_programada    DATE NULL,
    fecha_ejecucion     DATE NULL,
    costo_estimado      DECIMAL(14,2) NULL,
    costo_real          DECIMAL(14,2) NULL,
    estado              NVARCHAR(15) NOT NULL DEFAULT 'programado',
    responsable_id      INT NULL,
    observaciones       NVARCHAR(MAX) NULL,
    created_at          DATETIME2 DEFAULT GETDATE(),
    updated_at          DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_mant_copropiedad FOREIGN KEY (copropiedad_id) REFERENCES copropiedades(id),
    CONSTRAINT FK_mant_proveedor   FOREIGN KEY (proveedor_id)   REFERENCES proveedores(id),
    CONSTRAINT FK_mant_resp        FOREIGN KEY (responsable_id) REFERENCES usuarios(id),
    CONSTRAINT CK_mant_estado CHECK (estado IN ('programado','en_proceso','completado','cancelado'))
);
GO

-- ═══════════════════════════════════════════════════════
--  10. PRESUPUESTO Y EGRESOS
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='presupuestos')
CREATE TABLE presupuestos (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id  INT NOT NULL,
    anio            SMALLINT NOT NULL,
    rubro           NVARCHAR(80) NOT NULL,
    categoria       NVARCHAR(50) NULL,   -- operacional | mantenimiento | reservas | administracion
    monto_aprobado  DECIMAL(14,2) NOT NULL,
    created_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_pres_copropiedad FOREIGN KEY (copropiedad_id) REFERENCES copropiedades(id)
);
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='egresos')
CREATE TABLE egresos (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id  INT NOT NULL,
    presupuesto_id  INT NULL,
    proveedor_id    INT NULL,
    concepto        NVARCHAR(200) NOT NULL,
    fecha           DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    monto           DECIMAL(14,2) NOT NULL,
    metodo_pago     NVARCHAR(20) NOT NULL DEFAULT 'transferencia',
    referencia      NVARCHAR(100) NULL,
    comprobante_url NVARCHAR(MAX) NULL,
    aprobado_por    INT NULL,
    created_at      DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_egr_copropiedad FOREIGN KEY (copropiedad_id) REFERENCES copropiedades(id),
    CONSTRAINT FK_egr_presupuesto FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id),
    CONSTRAINT FK_egr_proveedor   FOREIGN KEY (proveedor_id)   REFERENCES proveedores(id),
    CONSTRAINT FK_egr_aprobado    FOREIGN KEY (aprobado_por)   REFERENCES usuarios(id),
    CONSTRAINT CK_egr_monto CHECK (monto > 0)
);
GO
CREATE INDEX IX_egresos_fecha       ON egresos(fecha);
CREATE INDEX IX_egresos_copropiedad ON egresos(copropiedad_id);
GO

-- ═══════════════════════════════════════════════════════
--  11. ASAMBLEAS
-- ═══════════════════════════════════════════════════════
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='asambleas')
CREATE TABLE asambleas (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    copropiedad_id      INT NOT NULL,
    tipo                NVARCHAR(20) NOT NULL DEFAULT 'ordinaria',
    titulo              NVARCHAR(200) NOT NULL,
    fecha               DATETIME2 NOT NULL,
    lugar               NVARCHAR(200) NULL,
    quorum_requerido    DECIMAL(5,2) NULL,
    quorum_alcanzado    DECIMAL(5,2) NULL,
    estado              NVARCHAR(15) NOT NULL DEFAULT 'convocada',
    acta_url            NVARCHAR(MAX) NULL,
    notas               NVARCHAR(MAX) NULL,
    created_at          DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_asam_copropiedad FOREIGN KEY (copropiedad_id) REFERENCES copropiedades(id),
    CONSTRAINT CK_asam_tipo   CHECK (tipo IN ('ordinaria','extraordinaria')),
    CONSTRAINT CK_asam_estado CHECK (estado IN ('convocada','realizada','cancelada'))
);
GO

-- ═══════════════════════════════════════════════════════
--  TRIGGERS updated_at
-- ═══════════════════════════════════════════════════════
GO
CREATE OR ALTER TRIGGER trg_copropiedades_upd ON copropiedades AFTER UPDATE AS
BEGIN SET NOCOUNT ON; UPDATE copropiedades SET updated_at=GETDATE() FROM copropiedades c INNER JOIN inserted i ON c.id=i.id; END
GO
CREATE OR ALTER TRIGGER trg_usuarios_upd ON usuarios AFTER UPDATE AS
BEGIN SET NOCOUNT ON; UPDATE usuarios SET updated_at=GETDATE() FROM usuarios u INNER JOIN inserted i ON u.id=i.id; END
GO
CREATE OR ALTER TRIGGER trg_unidades_upd ON unidades AFTER UPDATE AS
BEGIN SET NOCOUNT ON; UPDATE unidades SET updated_at=GETDATE() FROM unidades u INNER JOIN inserted i ON u.id=i.id; END
GO
CREATE OR ALTER TRIGGER trg_facturas_upd ON facturas AFTER UPDATE AS
BEGIN SET NOCOUNT ON; UPDATE facturas SET updated_at=GETDATE() FROM facturas f INNER JOIN inserted i ON f.id=i.id; END
GO
CREATE OR ALTER TRIGGER trg_pagos_upd ON pagos AFTER UPDATE AS
BEGIN SET NOCOUNT ON; UPDATE pagos SET updated_at=GETDATE() FROM pagos p INNER JOIN inserted i ON p.id=i.id; END
GO
CREATE OR ALTER TRIGGER trg_pqr_upd ON pqr AFTER UPDATE AS
BEGIN SET NOCOUNT ON; UPDATE pqr SET updated_at=GETDATE() FROM pqr p INNER JOIN inserted i ON p.id=i.id; END
GO
CREATE OR ALTER TRIGGER trg_reservas_upd ON reservas AFTER UPDATE AS
BEGIN SET NOCOUNT ON; UPDATE reservas SET updated_at=GETDATE() FROM reservas r INNER JOIN inserted i ON r.id=i.id; END
GO

-- ═══════════════════════════════════════════════════════
--  TRIGGER CLAVE: Recalcular estado factura al pagar
-- ═══════════════════════════════════════════════════════
CREATE OR ALTER TRIGGER trg_pagos_actualizar_factura
ON pagos AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ids TABLE (id INT);
    INSERT INTO @ids
        SELECT DISTINCT factura_id FROM inserted WHERE factura_id IS NOT NULL
        UNION
        SELECT DISTINCT factura_id FROM deleted  WHERE factura_id IS NOT NULL;

    UPDATE f
    SET f.estado = CASE
        WHEN f.estado = 'anulada'                   THEN 'anulada'
        WHEN ISNULL(pg.pagado, 0) <= 0              THEN 'pendiente'
        WHEN ISNULL(pg.pagado, 0) >= f.total        THEN 'pagada'
        ELSE 'parcial'
    END
    FROM facturas f
    INNER JOIN @ids x ON f.id = x.id
    LEFT JOIN (
        SELECT factura_id, SUM(monto) AS pagado
        FROM pagos
        WHERE estado IN ('registrado','verificado')
        GROUP BY factura_id
    ) pg ON pg.factura_id = f.id;
END
GO

-- ═══════════════════════════════════════════════════════
--  VISTAS
-- ═══════════════════════════════════════════════════════

CREATE OR ALTER VIEW v_estado_financiero AS
SELECT
    u.id                                        AS unidad_id,
    u.numero                                    AS unidad,
    u.tipo,
    u.coeficiente,
    p.nombre + ' ' + p.apellido                AS propietario,
    p.email                                     AS email_propietario,
    p.telefono,
    f.id                                        AS factura_id,
    f.periodo_anio,
    f.periodo_mes,
    f.total                                     AS valor_factura,
    ISNULL(pg.pagado, 0)                        AS total_pagado,
    f.total - ISNULL(pg.pagado, 0)              AS saldo_pendiente,
    f.estado                                    AS estado_factura,
    f.fecha_vencimiento
FROM unidades u
LEFT JOIN ocupaciones o ON o.unidad_id = u.id AND o.activa = 1 AND o.rol = 'propietario'
LEFT JOIN personas p    ON p.id = o.persona_id
LEFT JOIN facturas f    ON f.unidad_id = u.id
LEFT JOIN (
    SELECT factura_id, SUM(monto) AS pagado
    FROM pagos WHERE estado IN ('registrado','verificado')
    GROUP BY factura_id
) pg ON pg.factura_id = f.id
WHERE u.activa = 1;
GO

CREATE OR ALTER VIEW v_resumen_mensual AS
SELECT
    f.copropiedad_id,
    f.periodo_anio,
    f.periodo_mes,
    COUNT(f.id)                                                                      AS total_facturas,
    SUM(CASE WHEN f.estado = 'pagada'    THEN 1 ELSE 0 END)                          AS facturas_pagadas,
    SUM(CASE WHEN f.estado = 'pendiente' THEN 1 ELSE 0 END)                          AS facturas_pendientes,
    SUM(CASE WHEN f.estado = 'vencida'   THEN 1 ELSE 0 END)                          AS facturas_vencidas,
    SUM(f.total)                                                                     AS total_facturado,
    ISNULL(SUM(pg.monto_mes), 0)                                                    AS total_recaudado,
    SUM(f.total) - ISNULL(SUM(pg.monto_mes), 0)                                    AS total_pendiente,
    CASE WHEN SUM(f.total) > 0
         THEN ROUND(ISNULL(SUM(pg.monto_mes), 0) / SUM(f.total) * 100, 2)
         ELSE 0 END                                                                  AS pct_recaudo
FROM facturas f
LEFT JOIN (
    SELECT factura_id, SUM(monto) AS monto_mes
    FROM pagos WHERE estado IN ('registrado','verificado')
    GROUP BY factura_id
) pg ON pg.factura_id = f.id
GROUP BY f.copropiedad_id, f.periodo_anio, f.periodo_mes;
GO

CREATE OR ALTER VIEW v_unidades_mora AS
SELECT
    u.id, u.numero, u.tipo, u.copropiedad_id,
    p.nombre + ' ' + p.apellido            AS propietario,
    p.telefono,
    p.email,
    COUNT(f.id)                            AS facturas_vencidas,
    SUM(f.total - ISNULL(pg.pagado, 0))   AS deuda_total
FROM unidades u
JOIN facturas f ON f.unidad_id = u.id AND f.estado = 'vencida'
LEFT JOIN ocupaciones o ON o.unidad_id = u.id AND o.activa = 1 AND o.rol = 'propietario'
LEFT JOIN personas p    ON p.id = o.persona_id
LEFT JOIN (
    SELECT factura_id, SUM(monto) AS pagado
    FROM pagos WHERE estado IN ('registrado','verificado')
    GROUP BY factura_id
) pg ON pg.factura_id = f.id
GROUP BY u.id, u.numero, u.tipo, u.copropiedad_id,
         p.nombre, p.apellido, p.telefono, p.email
HAVING SUM(f.total - ISNULL(pg.pagado, 0)) > 0;
GO

-- ═══════════════════════════════════════════════════════
--  STORED PROCEDURE: Generacion masiva de facturas mensuales
-- ═══════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE sp_generar_facturacion_mensual
    @copropiedad_id   INT,
    @anio             SMALLINT,
    @mes              SMALLINT,
    @valor_base       DECIMAL(14,2),
    @metodo           NVARCHAR(15),   -- 'fijo' | 'coeficiente'
    @dias_venc        INT = 20,
    @usuario_id       INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @mes NOT BETWEEN 1 AND 12
        THROW 50001, 'Mes invalido: debe estar entre 1 y 12.', 1;
    IF @valor_base <= 0
        THROW 50002, 'El valor base debe ser mayor a 0.', 1;
    IF @metodo NOT IN ('fijo', 'coeficiente')
        THROW 50003, 'Metodo invalido. Use: fijo | coeficiente.', 1;

    DECLARE @fem   DATE = DATEFROMPARTS(@anio, @mes, 1);
    DECLARE @fven  DATE = DATEADD(DAY, @dias_venc, @fem);
    DECLARE @gen   INT;
    DECLARE @total INT;
    DECLARE @om    INT;

    BEGIN TRANSACTION;

    INSERT INTO facturas (
        copropiedad_id, unidad_id, periodo_anio, periodo_mes,
        fecha_emision, fecha_vencimiento, valor_admin, generada_por
    )
    SELECT
        @copropiedad_id,
        u.id,
        @anio,
        @mes,
        @fem,
        @fven,
        CASE WHEN @metodo = 'coeficiente'
             THEN ROUND(@valor_base * ISNULL(u.coeficiente, 0) * 100, 0)
             ELSE @valor_base
        END,
        @usuario_id
    FROM unidades u
    WHERE u.copropiedad_id = @copropiedad_id
      AND u.activa = 1
      AND NOT EXISTS (
          SELECT 1 FROM facturas f
          WHERE f.unidad_id = u.id
            AND f.periodo_anio = @anio
            AND f.periodo_mes  = @mes
      );

    SET @gen = @@ROWCOUNT;

    SELECT @total = COUNT(*) FROM unidades
    WHERE copropiedad_id = @copropiedad_id AND activa = 1;

    SET @om = @total - @gen;

    INSERT INTO generaciones_facturacion (
        copropiedad_id, periodo_anio, periodo_mes, metodo, valor_base,
        total_unidades, total_generadas, total_omitidas, generado_por
    )
    VALUES (
        @copropiedad_id, @anio, @mes, @metodo, @valor_base,
        @total, @gen, @om, @usuario_id
    );

    COMMIT TRANSACTION;

    -- Resultado para Node.js
    SELECT @gen AS total_generadas, @om AS total_omitidas, @total AS total_unidades;
END
GO

-- SP: Marcar facturas vencidas (llamar desde SQL Server Agent diariamente)
CREATE OR ALTER PROCEDURE sp_actualizar_facturas_vencidas AS
BEGIN
    SET NOCOUNT ON;
    UPDATE facturas
    SET estado = 'vencida'
    WHERE estado = 'pendiente'
      AND fecha_vencimiento < CAST(GETDATE() AS DATE);
    SELECT @@ROWCOUNT AS facturas_marcadas_vencidas;
END
GO

PRINT '=========================================';
PRINT '  Schema PH Inteligente (SQL Server)';
PRINT '  Creado correctamente.';
PRINT '=========================================';
GO