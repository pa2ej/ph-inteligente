-- ================================================================
--  PH INTELIGENTE — Datos semilla (SQL Server)
--  Ejecutar DESPUES de 01_schema.sql
--  sqlcmd -S SERVIDOR -U sa -P Password -d ph_inteligente -i 02_seed.sql
-- ================================================================

USE ph_inteligente;
GO

-- ═══ Copropiedad demo ════════════════════════════════════════
INSERT INTO copropiedades (nombre, nit, direccion, ciudad, departamento, telefono, email, representante)
VALUES ('Residencial El Roble', '900.123.456-7', 'Carrera 45 # 12-30, Prado',
        'Medellin', 'Antioquia', '604-555-0100', 'admin@elroble.com.co', 'Carlos Andres Mendoza');
GO

-- ═══ Usuarios (password: "Admin2025!" hasheado con bcrypt rounds=10) ════
-- El hash real se genera en Node.js: bcrypt.hash('Admin2025!', 10)
-- Para desarrollo usamos password simple: "password" (hash: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi)
INSERT INTO usuarios (copropiedad_id, nombre_completo, email, password_hash, cargo, rol)
VALUES
(1, 'Carlos Andres Mendoza', 'admin@ph.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador General', 'administrador'),
(1, 'Sandra Milena Ruiz',    'contador@ph.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Contador',              'contador'),
(1, 'Juan Porteria',         'portero@ph.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Portero Turno Dia',     'portero');
GO

-- ═══ Torre ═══════════════════════════════════════════════════
INSERT INTO torres (copropiedad_id, nombre, pisos)
VALUES (1, 'Torre Unica', 5);
GO

-- ═══ Unidades: 40 apartamentos (5 pisos x 8) + 8 parqueaderos ════
DECLARE @piso INT = 1;
WHILE @piso <= 5
BEGIN
    INSERT INTO unidades (copropiedad_id, torre_id, numero, piso, tipo, area_m2, coeficiente)
    SELECT 1, 1,
        CAST(@piso AS NVARCHAR) + letra,
        @piso,
        'apartamento',
        CASE letra
            WHEN 'A' THEN 75.00 WHEN 'H' THEN 75.00
            WHEN 'B' THEN 68.00 WHEN 'G' THEN 68.00
            ELSE 62.00
        END,
        CASE letra
            WHEN 'A' THEN 0.024500 WHEN 'H' THEN 0.024500
            WHEN 'B' THEN 0.023000 WHEN 'G' THEN 0.023000
            ELSE 0.020500
        END
    FROM (VALUES ('A'),('B'),('C'),('D'),('E'),('F'),('G'),('H')) AS L(letra);
    SET @piso = @piso + 1;
END

DECLARE @p INT = 1;
WHILE @p <= 8
BEGIN
    INSERT INTO unidades (copropiedad_id, torre_id, numero, piso, tipo, area_m2, coeficiente)
    VALUES (1, 1, 'P-0' + CAST(@p AS NVARCHAR), -1, 'parqueadero', 14.00, 0.005000);
    SET @p = @p + 1;
END
GO

-- ═══ Personas / Propietarios ════════════════════════════════
INSERT INTO personas (tipo_doc, num_doc, nombre, apellido, telefono, email) VALUES
('CC', '1001234567', 'Ana',    'Garcia Vargas',   '3001112233', 'ana.garcia@email.com'),
('CC', '1002345678', 'Luis',   'Torres Munoz',    '3012223344', 'luis.torres@email.com'),
('CC', '1003456789', 'Maria',  'Lopez Hernandez', '3023334455', 'maria.lopez@email.com'),
('CC', '1004567890', 'Pedro',  'Soto Rios',       '3034445566', 'pedro.soto@email.com'),
('CC', '1005678901', 'Carmen', 'Ruiz Salcedo',    '3045556677', 'carmen.ruiz@email.com'),
('CC', '1006789012', 'Jorge',  'Mora Castro',     '3056667788', 'jorge.mora@email.com'),
('CC', '1007890123', 'Sandra', 'Reyes Ospina',    '3067778899', 'sandra.reyes@email.com'),
('CC', '1008901234', 'Andres', 'Parra Gomez',     '3078889900', 'andres.parra@email.com');
GO

-- ═══ Asignar propietarios a primeras 8 unidades ════════════
INSERT INTO ocupaciones (unidad_id, persona_id, rol, fecha_inicio)
SELECT u.id, p.id, 'propietario', '2022-01-01'
FROM (VALUES ('1A',1),('1B',2),('2A',3),('2B',4),
             ('3A',5),('3B',6),('4A',7),('4B',8)) AS asig(num, pid)
JOIN unidades u  ON u.numero = asig.num  AND u.copropiedad_id = 1
JOIN personas p  ON p.id = asig.pid;
GO

-- ═══ Facturas (3 meses) ═════════════════════════════════════
DECLARE @offset INT = 0;
WHILE @offset <= 2
BEGIN
    DECLARE @fem2  DATE = DATEFROMPARTS(YEAR(DATEADD(MONTH,-@offset,GETDATE())), MONTH(DATEADD(MONTH,-@offset,GETDATE())), 1);
    DECLARE @fven2 DATE = DATEADD(DAY, 20, @fem2);
    DECLARE @anio2 SMALLINT = YEAR(@fem2);
    DECLARE @mes2  SMALLINT = MONTH(@fem2);

    INSERT INTO facturas (copropiedad_id, unidad_id, periodo_anio, periodo_mes,
        fecha_emision, fecha_vencimiento, valor_admin, generada_por)
    SELECT 1, u.id, @anio2, @mes2, @fem2, @fven2,
        ROUND(280000 * ISNULL(u.coeficiente,0) * 100, 0),
        1
    FROM unidades u
    WHERE u.copropiedad_id = 1 AND u.activa = 1
      AND NOT EXISTS (
          SELECT 1 FROM facturas f
          WHERE f.unidad_id = u.id AND f.periodo_anio = @anio2 AND f.periodo_mes = @mes2
      );

    SET @offset = @offset + 1;
END
GO

-- ═══ Pagos (mes actual, primeras 6 unidades) ════════════════
DECLARE @anio3 SMALLINT = YEAR(GETDATE());
DECLARE @mes3  SMALLINT = MONTH(GETDATE());
DECLARE @i     INT = 0;

DECLARE pago_cur CURSOR FOR
    SELECT TOP 6 f.id, f.unidad_id, f.total
    FROM facturas f
    JOIN unidades u ON u.id = f.unidad_id
    WHERE f.periodo_anio = @anio3 AND f.periodo_mes = @mes3 AND f.copropiedad_id = 1
    ORDER BY u.numero;

OPEN pago_cur;
DECLARE @fid INT, @uid INT, @total DECIMAL(14,2);
FETCH NEXT FROM pago_cur INTO @fid, @uid, @total;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @i = @i + 1;
    INSERT INTO pagos (copropiedad_id, factura_id, unidad_id, fecha_pago, monto, metodo, referencia, estado, registrado_por)
    VALUES (1, @fid, @uid,
        DATEADD(DAY, -@i, CAST(GETDATE() AS DATE)),
        @total,
        CASE WHEN @i % 2 = 0 THEN 'transferencia' ELSE 'efectivo' END,
        CASE WHEN @i % 2 = 0 THEN 'TRF-2025-' + RIGHT('0000' + CAST(@i AS NVARCHAR), 4) ELSE NULL END,
        'verificado',
        1);
    FETCH NEXT FROM pago_cur INTO @fid, @uid, @total;
END
CLOSE pago_cur;
DEALLOCATE pago_cur;
GO

-- ═══ Areas comunes ═══════════════════════════════════════════
INSERT INTO areas_comunes (copropiedad_id, nombre, descripcion, capacidad, valor_reserva, requiere_deposito, valor_deposito)
VALUES
(1, 'Salon Social',    'Salon para eventos y reuniones',    80, 150000, 1, 200000),
(1, 'BBQ / Parrilla',  'Zona de parrilla al aire libre',   20,  80000, 1, 100000),
(1, 'Piscina',         'Piscina adultos y ninos',          30,      0, 0,      0),
(1, 'Gimnasio',        'Equipos de cardio y pesas',        10,      0, 0,      0),
(1, 'Cancha Multiple', 'Futbol sala, basquetbol, voley',   20,      0, 0,      0);
GO

-- ═══ PQR de ejemplo ═══════════════════════════════════════════
INSERT INTO pqr (copropiedad_id, tipo, asunto, descripcion, unidad_id, estado, prioridad)
VALUES
(1, 'queja',     'Ruido nocturno',        'Ruido constante despues de las 11pm en piso 3', 3,    'en_tramite', 1),
(1, 'peticion',  'Reparacion ascensor',   'El ascensor falla intermitentemente 3 dias',    NULL, 'recibido',   1),
(1, 'sugerencia','Iluminacion parking',   'La iluminacion del parqueadero esta muy baja',  NULL, 'recibido',   3),
(1, 'reclamo',   'Factura incorrecta',    'Mi factura de enero tiene cobros no explicados', 1,   'respondido', 2);
GO

-- ═══ Proveedor de ejemplo ═════════════════════════════════════
INSERT INTO proveedores (copropiedad_id, razon_social, nit, contacto, telefono, email, especialidad)
VALUES
(1, 'Electricos Medellin SAS', '900.777.001-1', 'Roberto Arango', '3101234567', 'contacto@electricos.com.co', 'electrico'),
(1, 'Ascensores Colombia',     '900.888.002-2', 'Maria Restrepo', '3112345678', 'info@ascensores.com.co',     'ascensores');
GO

-- ═══ Ejecutar SP para marcar vencidas ═════════════════════════
EXEC sp_actualizar_facturas_vencidas;
GO

-- ═══ Verificacion ════════════════════════════════════════════
SELECT 'copropiedades'      AS tabla, COUNT(*) AS total FROM copropiedades UNION ALL
SELECT 'usuarios',                    COUNT(*) FROM usuarios     UNION ALL
SELECT 'unidades',                    COUNT(*) FROM unidades     UNION ALL
SELECT 'personas',                    COUNT(*) FROM personas     UNION ALL
SELECT 'facturas',                    COUNT(*) FROM facturas     UNION ALL
SELECT 'pagos',                       COUNT(*) FROM pagos        UNION ALL
SELECT 'areas_comunes',               COUNT(*) FROM areas_comunes UNION ALL
SELECT 'pqr',                         COUNT(*) FROM pqr;
GO

PRINT 'Seed completado. Login demo: admin@ph.com / password';
GO