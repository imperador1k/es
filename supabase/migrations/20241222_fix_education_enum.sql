-- ============================================================
-- VERIFICAR E CORRIGIR O ENUM education_level
-- ============================================================

-- 1. Ver valores atuais do enum
SELECT enum_range(NULL::education_level);

-- 2. Se precisares adicionar valores, usa isto:
-- (descomenta e executa as linhas necessárias)

-- ALTER TYPE education_level ADD VALUE IF NOT EXISTS '2_ciclo';
-- ALTER TYPE education_level ADD VALUE IF NOT EXISTS '3_ciclo';
-- ALTER TYPE education_level ADD VALUE IF NOT EXISTS 'secundario';
-- ALTER TYPE education_level ADD VALUE IF NOT EXISTS 'superior';

-- OU se quiseres recriar o enum (mais drástico):
-- DROP TYPE IF EXISTS education_level CASCADE;
-- CREATE TYPE education_level AS ENUM ('2_ciclo', '3_ciclo', 'secundario', 'superior');

-- 3. Se o enum já existe com valores diferentes (ex: '2º Ciclo'), 
--    então preciso atualizar o código TypeScript para usar esses valores.
