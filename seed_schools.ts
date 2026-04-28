import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';
import proj4 from 'proj4';

dotenv.config();

// Definição do sistema de coordenadas de Portugal (PT-TM06 / EPSG:3763)
const PT_TM06 = '+proj=tmerc +lat_0=39.66825833333333 +lon_0=-8.133333333333333 +k=1 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs';
const WGS84 = 'WGS84';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente EXPO_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedSchools() {
  const filePath = path.resolve(process.cwd(), 'RedeEscolar_mapa_71350158882216275.csv');
  
  console.log('🚀 A iniciar importação de escolas...');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Ficheiro não encontrado: ${filePath}`);
    return;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ',',
    bom: true,
    relax_column_count: true,
    relax_quotes: true, // Aceita aspas mal formatadas no meio do texto
    escape: '"', // Define como as aspas são escapadas
  });

  console.log(`📊 Total de registos no CSV: ${records.length}`);

  const filteredSchools = records.filter((row: any) => {
    const ciclos = row.CICLO || '';
    return ciclos.includes('2º Ciclo') || 
           ciclos.includes('3º Ciclo') || 
           ciclos.includes('Secundário');
  });

  console.log(`🎯 Escolas filtradas: ${filteredSchools.length}`);

  const batchSize = 50; // Lotes menores para evitar timeouts
  let totalInserted = 0;

  for (let i = 0; i < filteredSchools.length; i += batchSize) {
    const batch = filteredSchools.slice(i, i + batchSize).map((row: any) => {
      const rawX = row.x ? String(row.x).replace(',', '.') : null;
      const rawY = row.y ? String(row.y).replace(',', '.') : null;
      const x = rawX ? parseFloat(rawX) : null;
      const y = rawY ? parseFloat(rawY) : null;
      
      let lat = null;
      let lon = null;

      if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) {
        const [convertedLon, convertedLat] = proj4(PT_TM06, WGS84, [x, y]);
        lat = convertedLat;
        lon = convertedLon;
      }

      return {
        id: row.CODESCME, 
        name: row.NOME,
        district: row.DISTRITO,
        municipality: row.CONCELHO,
        nature: row.NATUREZAINSTITUCIONAL_DESC,
        cycles: row.CICLO,
        address: row.MORADA,
        email: row.EMAIL,
        phone: row.TELEFONE,
        latitude: lat,
        longitude: lon
      };
    });

    const { error } = await supabase.from('schools').upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Erro no lote ${i / batchSize + 1}:`, error.message);
    } else {
      totalInserted += batch.length;
      console.log(`✅ Processados: ${totalInserted}/${filteredSchools.length}`);
    }
  }

  console.log('🎉 Tudo pronto!');
}

seedSchools().catch(console.error);
