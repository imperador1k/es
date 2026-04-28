import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function verifyLisbonRealCount() {
    const targetLat = 38.7107;
    const targetLon = -9.1402;

    const { data: schools } = await supabase
        .from('schools')
        .select('latitude, longitude')
        .not('latitude', 'is', null);

    const nearby = schools?.filter(s => {
        const d = getDistance(targetLat, targetLon, s.latitude, s.longitude);
        return d <= 30;
    });

    console.log(`✅ Total REAL de escolas num raio de 30km de Lisboa (via JS): ${nearby?.length}`);
}

verifyLisbonRealCount();
