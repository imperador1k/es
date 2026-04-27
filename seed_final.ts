import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis do ficheiro .env
dotenv.config();

// --- CONFIGURAÇÃO SEGURA ---
// Usa as variáveis de ambiente. Se não existirem, o script avisa.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const CSV_FILENAME = 'Livro1.csv'; 

// Mapa de Distritos
const DISTRICT_MAP: Record<string, string> = {
    'Aveiro': 'Aveiro', 'Beira Interior': 'Castelo Branco', 'Coimbra': 'Coimbra',
    'Évora': 'Évora', 'Algarve': 'Faro', 'Lisboa': 'Lisboa', 'Madeira': 'Madeira',
    'Minho': 'Braga', 'Porto': 'Porto', 'Trás-os-Montes': 'Vila Real',
    'Açores': 'Açores', 'Maia': 'Porto', 'Fernando Pessoa': 'Porto',
    'Lusófona': 'Lisboa', 'Lusíada': 'Lisboa', 'Autónoma': 'Lisboa',
    'Católica': 'Lisboa', 'Europeia': 'Lisboa', 'ISCTE': 'Lisboa',
    'Politécnico de Leiria': 'Leiria', 'Politécnico do Porto': 'Porto',
    'Politécnico de Lisboa': 'Lisboa', 'Politécnico de Setúbal': 'Setúbal',
    'Politécnico de Viana': 'Viana do Castelo', 'Politécnico de Bragança': 'Bragança',
    'Politécnico de Castelo Branco': 'Castelo Branco', 'Politécnico de Coimbra': 'Coimbra',
    'Politécnico da Guarda': 'Guarda', 'Politécnico de Portalegre': 'Portalegre',
    'Politécnico de Santarém': 'Santarém', 'Politécnico de Tomar': 'Santarém',
    'Politécnico de Viseu': 'Viseu', 'Politécnico de Beja': 'Beja',
    'Politécnico do Cávado': 'Braga', 'Atlântica': 'Lisboa', 'Egas Moniz': 'Setúbal'
};

async function seed() {
    console.log(`🚀 A ler o ficheiro: ${CSV_FILENAME}...`);
    
    try {
        if (!fs.existsSync(CSV_FILENAME)) {
            console.error(`❌ Erro: Ficheiro ${CSV_FILENAME} não encontrado.`);
            return;
        }

        const fileContent = fs.readFileSync(CSV_FILENAME, 'utf-8');
        const records = parse(fileContent, { 
            columns: true, 
            delimiter: ';', 
            bom: true, 
            skip_empty_lines: true,
            trim: true,
            relax_quotes: true
        });

        console.log(`📊 Total linhas CSV: ${records.length}`);

        // --- 1. UNIVERSIDADES ---
        const unisMap = new Map();
        records.forEach((row: any) => {
            const id = row.CodigoEstabelecimento;
            if (id && !unisMap.has(id)) {
                let district = 'Outro';
                const name = row.Estabelecimento || '';
                for (const key in DISTRICT_MAP) {
                    if (name.includes(key)) {
                        district = DISTRICT_MAP[key];
                        break;
                    }
                }
                unisMap.set(id, {
                    id: id.toString(),
                    name: name,
                    type: row.Natureza,
                    district: district
                });
            }
        });

        console.log(`🏫 A inserir ${unisMap.size} Universidades...`);
        const unisArray = Array.from(unisMap.values());
        for (let i = 0; i < unisArray.length; i += 100) {
            await supabase.from('universities').upsert(unisArray.slice(i, i + 100));
        }

        // --- 2. CURSOS ---
        console.log('📚 A processar Cursos...');
        const uniqueCoursesMap = new Map();

        records.forEach((row: any) => {
            const uniId = row.CodigoEstabelecimento?.toString();
            const code = row.CodigoCurso?.toString();
            const unit = row.UnidadeOrganica || ''; 
            const uniqueKey = `${uniId}-${code}-${unit}`;

            if (uniId && code && !uniqueCoursesMap.has(uniqueKey)) {
                uniqueCoursesMap.set(uniqueKey, {
                    university_id: uniId,
                    code: code,
                    name: row.NomeCurso,
                    level: row.Grau,
                    organic_unit: unit
                });
            }
        });

        const courses = Array.from(uniqueCoursesMap.values());
        console.log(`✅ Cursos únicos identificados: ${courses.length}`);

        for (let i = 0; i < courses.length; i += 100) {
            const chunk = courses.slice(i, i + 100);
            const { error } = await supabase.from('degrees').upsert(chunk, { 
                onConflict: 'university_id, code, organic_unit'
            });
            
            if (error) {
                console.error('❌ Erro no lote:', error.message);
            }
        }

        console.log('🎉 Importação Finalizada com Segurança!');

    } catch (err) {
        console.error('❌ Erro Fatal:', err);
    }
}

seed();