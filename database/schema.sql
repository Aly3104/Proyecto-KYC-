-- ============================================================
-- KYC System - Microsoft SQL Server Schema
-- Prueba Técnica NextJS & NestJS
-- ============================================================
-- Justificación de decisiones de diseño:
--   1. Se usa un SCHEMA propio "kyc" para aislar lógicamente
--      todas las tablas del dominio y facilitar la gestión de
--      permisos a nivel de esquema.
--   2. Las tablas de autenticación siguen exactamente el contrato
--      que exige Better Auth (columnas en camelCase incluidas),
--      evitando cualquier mapeo adicional en código.
--   3. Se normalizaron nationalities, economic_activities y
--      fund_origins en tablas de catálogo separadas (en lugar
--      de almacenar texto libre en la tabla clients) para:
--        a) Evitar inconsistencias ortográficas.
--        b) Permitir asignar un peso de riesgo configurable a
--           cada valor, que el backend consume para calcular el
--           risk_level sin hardcodear strings.
--   4. La columna is_foreign en nationalities permite que la
--      lógica "Extranjero + efectivo alto → ALTO" se evalúe con
--      un JOIN simple, sin comparar strings de país.
--   5. La tabla alerts está relacionada a clients (ON DELETE
--      CASCADE) para que al eliminar un cliente se eliminen sus
--      alertas asociadas automáticamente.
-- ============================================================

-- Crear el esquema si no existe
IF SCHEMA_ID('kyc') IS NULL
    EXEC('CREATE SCHEMA kyc');
GO

-- ============================================================
-- TABLAS DE AUTENTICACIÓN (Better Auth contract)
-- ============================================================

IF OBJECT_ID(N'kyc.[user]', N'U') IS NULL
BEGIN
    CREATE TABLE kyc.[user] (
        id              NVARCHAR(36)   NOT NULL,
        name            NVARCHAR(255)  NOT NULL,
        email           NVARCHAR(255)  NOT NULL,
        emailVerified   BIT            NOT NULL DEFAULT 0,
        image           NVARCHAR(500)  NULL,
        -- Campo de rol personalizado (admin / analista)
        role            NVARCHAR(50)   NOT NULL DEFAULT 'analista',
        createdAt       DATETIME2      NOT NULL DEFAULT GETDATE(),
        updatedAt       DATETIME2      NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_user       PRIMARY KEY (id),
        CONSTRAINT UQ_user_email UNIQUE (email),
        CONSTRAINT CK_user_role  CHECK (role IN ('admin', 'analista'))
    );
END
GO

IF OBJECT_ID(N'kyc.[session]', N'U') IS NULL
BEGIN
    CREATE TABLE kyc.[session] (
        id          NVARCHAR(36)   NOT NULL,
        expiresAt   DATETIME2      NOT NULL,
        token       NVARCHAR(500)  NOT NULL,
        createdAt   DATETIME2      NOT NULL DEFAULT GETDATE(),
        updatedAt   DATETIME2      NOT NULL DEFAULT GETDATE(),
        ipAddress   NVARCHAR(100)  NULL,
        userAgent   NVARCHAR(500)  NULL,
        userId      NVARCHAR(36)   NOT NULL,

        CONSTRAINT PK_session       PRIMARY KEY (id),
        CONSTRAINT UQ_session_token UNIQUE (token),
        CONSTRAINT FK_session_user  FOREIGN KEY (userId)
            REFERENCES kyc.[user](id) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'kyc.[account]', N'U') IS NULL
BEGIN
    CREATE TABLE kyc.[account] (
        id                      NVARCHAR(36)   NOT NULL,
        accountId               NVARCHAR(255)  NOT NULL,
        providerId              NVARCHAR(100)  NOT NULL,
        userId                  NVARCHAR(36)   NOT NULL,
        accessToken             NVARCHAR(MAX)  NULL,
        refreshToken            NVARCHAR(MAX)  NULL,
        idToken                 NVARCHAR(MAX)  NULL,
        accessTokenExpiresAt    DATETIME2      NULL,
        refreshTokenExpiresAt   DATETIME2      NULL,
        scope                   NVARCHAR(500)  NULL,
        password                NVARCHAR(500)  NULL,
        createdAt               DATETIME2      NOT NULL DEFAULT GETDATE(),
        updatedAt               DATETIME2      NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_account      PRIMARY KEY (id),
        CONSTRAINT FK_account_user FOREIGN KEY (userId)
            REFERENCES kyc.[user](id) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'kyc.[verification]', N'U') IS NULL
BEGIN
    CREATE TABLE kyc.[verification] (
        id          NVARCHAR(36)   NOT NULL,
        identifier  NVARCHAR(255)  NOT NULL,
        value       NVARCHAR(500)  NOT NULL,
        expiresAt   DATETIME2      NOT NULL,
        createdAt   DATETIME2      NULL DEFAULT GETDATE(),
        updatedAt   DATETIME2      NULL DEFAULT GETDATE(),

        CONSTRAINT PK_verification PRIMARY KEY (id)
    );
END
GO

-- ============================================================
-- TABLAS DE CATÁLOGO
-- ============================================================

IF OBJECT_ID(N'kyc.nationalities', N'U') IS NULL
BEGIN
    CREATE TABLE kyc.nationalities (
        id          INT             NOT NULL IDENTITY(1,1),
        name        NVARCHAR(100)   NOT NULL,
        -- codigo ISO 3166-1 alpha-3 (ej. COL, USA, VEN)
        code        NVARCHAR(3)     NOT NULL,
        -- Indica si la nacionalidad se considera "extranjera" respecto
        -- al país de operación. Usado en la lógica de riesgo.
        is_foreign  BIT             NOT NULL DEFAULT 0,

        CONSTRAINT PK_nationalities      PRIMARY KEY (id),
        CONSTRAINT UQ_nationalities_code UNIQUE (code)
    );
END
GO

IF OBJECT_ID(N'kyc.economic_activities', N'U') IS NULL
BEGIN
    CREATE TABLE kyc.economic_activities (
        id          INT             NOT NULL IDENTITY(1,1),
        name        NVARCHAR(150)   NOT NULL,
        -- Valor de 0-10 que el backend suma al score de riesgo
        risk_weight INT             NOT NULL DEFAULT 0,

        CONSTRAINT PK_economic_activities PRIMARY KEY (id),
        CONSTRAINT CK_ea_risk_weight      CHECK (risk_weight BETWEEN 0 AND 10)
    );
END
GO

IF OBJECT_ID(N'kyc.fund_origins', N'U') IS NULL
BEGIN
    CREATE TABLE kyc.fund_origins (
        id          INT             NOT NULL IDENTITY(1,1),
        name        NVARCHAR(150)   NOT NULL,
        -- "cash" implica riesgo mayor; el peso lo consume la lógica de negocio
        is_cash     BIT             NOT NULL DEFAULT 0,
        risk_weight INT             NOT NULL DEFAULT 0,

        CONSTRAINT PK_fund_origins       PRIMARY KEY (id),
        CONSTRAINT CK_fo_risk_weight     CHECK (risk_weight BETWEEN 0 AND 10)
    );
END
GO

-- ============================================================
-- TABLA PRINCIPAL: CLIENTES KYC
-- ============================================================

IF OBJECT_ID(N'kyc.clients', N'U') IS NULL
BEGIN
    CREATE TABLE kyc.clients (
        id                          NVARCHAR(36)    NOT NULL,
        full_name                   NVARCHAR(255)   NOT NULL,
        identification              NVARCHAR(50)    NOT NULL,
        nationality_id              INT             NOT NULL,
        economic_activity_id        INT             NOT NULL,
        fund_origin_id              INT             NOT NULL,
        estimated_monthly_amount    DECIMAL(18, 2)  NOT NULL,
        -- Calculado por el backend según la lógica de negocio
        risk_level                  NVARCHAR(10)    NOT NULL DEFAULT 'BAJO',
        created_by                  NVARCHAR(36)    NOT NULL,
        created_at                  DATETIME2       NOT NULL DEFAULT GETDATE(),
        updated_at                  DATETIME2       NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_clients                    PRIMARY KEY (id),
        CONSTRAINT UQ_clients_identification     UNIQUE (identification),
        CONSTRAINT CK_clients_risk_level         CHECK (risk_level IN ('BAJO', 'MEDIO', 'ALTO')),
        CONSTRAINT CK_clients_monthly_amount     CHECK (estimated_monthly_amount >= 0),
        CONSTRAINT FK_clients_nationality        FOREIGN KEY (nationality_id)
            REFERENCES kyc.nationalities(id),
        CONSTRAINT FK_clients_economic_activity  FOREIGN KEY (economic_activity_id)
            REFERENCES kyc.economic_activities(id),
        CONSTRAINT FK_clients_fund_origin        FOREIGN KEY (fund_origin_id)
            REFERENCES kyc.fund_origins(id),
        CONSTRAINT FK_clients_created_by         FOREIGN KEY (created_by)
            REFERENCES kyc.[user](id)
    );
END
GO

-- ============================================================
-- TABLA DE ALERTAS
-- ============================================================

IF OBJECT_ID(N'kyc.alerts', N'U') IS NULL
BEGIN
    CREATE TABLE kyc.alerts (
        id          NVARCHAR(36)   NOT NULL,
        client_id   NVARCHAR(36)   NOT NULL,
        -- Tipos de alerta definidos por los requerimientos funcionales
        type        NVARCHAR(50)   NOT NULL,
        description NVARCHAR(500)  NOT NULL,
        is_resolved BIT            NOT NULL DEFAULT 0,
        resolved_by NVARCHAR(36)   NULL,
        resolved_at DATETIME2      NULL,
        created_at  DATETIME2      NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_alerts             PRIMARY KEY (id),
        CONSTRAINT CK_alerts_type        CHECK (type IN (
            'EFECTIVO_ALTO',
            'DATOS_INCOMPLETOS',
            'USO_TERCEROS',
            'RIESGO_ALTO',
            'EXTRANJERO_EFECTIVO_ALTO'
        )),
        -- Al eliminar un cliente se eliminan sus alertas
        CONSTRAINT FK_alerts_client      FOREIGN KEY (client_id)
            REFERENCES kyc.clients(id) ON DELETE CASCADE,
        CONSTRAINT FK_alerts_resolver    FOREIGN KEY (resolved_by)
            REFERENCES kyc.[user](id)
    );
END
GO

-- ============================================================
-- DATOS SEMILLA (catálogos básicos)
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM kyc.nationalities)
BEGIN
    INSERT INTO kyc.nationalities (name, code, is_foreign) VALUES
        ('Colombia',            'COL', 0),
        ('Venezuela',           'VEN', 1),
        ('Estados Unidos',      'USA', 1),
        ('México',              'MEX', 1),
        ('Panamá',              'PAN', 1),
        ('Ecuador',             'ECU', 1),
        ('Perú',                'PER', 1),
        ('Brasil',              'BRA', 1),
        ('Argentina',           'ARG', 1),
        ('España',              'ESP', 1);
END
GO

IF NOT EXISTS (SELECT 1 FROM kyc.economic_activities)
BEGIN
    INSERT INTO kyc.economic_activities (name, risk_weight) VALUES
        ('Empleado / Asalariado',                0),
        ('Comerciante / Negocio propio',         2),
        ('Prestación de servicios profesionales',1),
        ('Importación / Exportación',            4),
        ('Construcción',                         3),
        ('Minería',                              5),
        ('Agricultura',                          1),
        ('Sector financiero',                    2),
        ('Actividad no declarada',               8),
        ('Otro',                                 3);
END
GO

IF NOT EXISTS (SELECT 1 FROM kyc.fund_origins)
BEGIN
    INSERT INTO kyc.fund_origins (name, is_cash, risk_weight) VALUES
        ('Salario / Nómina',            0, 0),
        ('Ahorro personal',             0, 1),
        ('Venta de inmueble',           0, 2),
        ('Herencia',                    0, 2),
        ('Efectivo (cash)',             1, 5),
        ('Transferencia internacional', 0, 3),
        ('Inversiones',                 0, 1),
        ('Préstamo bancario',           0, 1),
        ('Fondos de terceros',          0, 6),
        ('Origen no declarado',         0, 9);
END
GO

-- Usuario administrador por defecto (opcional)
-- IF NOT EXISTS (SELECT 1 FROM kyc.[user] WHERE email = 'admin@kyc.local')
-- BEGIN
--     INSERT INTO kyc.[user] (id, name, email, emailVerified, role)
--     VALUES (CONVERT(NVARCHAR(36), NEWID()), 'Administrador', 'admin@kyc.local', 1, 'admin');
-- END
-- GO