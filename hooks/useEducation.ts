import { supabase } from '@/lib/supabase';
import { useCallback } from 'react';

// Tipos para os dados educacionais
// Valores DO ENUM na BD: basic_2, basic_3, secondary, university
export type EducationLevel = 'basic_2' | 'basic_3' | 'secondary' | 'university';

export interface School {
    id: string;
    name: string;
    district: string | null;
    municipality: string | null;
    cycles: string | null;
}

export interface University {
    id: string;
    name: string;
    type: string | null;
    district: string | null; // NOVO: distrito da universidade
}

export interface Degree {
    id: string;
    name: string;
    university_id: string | null;
    code: string | null;
    organic_unit: string | null; // NOVO: unidade orgânica
    level: string | null; // NOVO: grau (Licenciatura, Mestrado, etc)
}

/**
 * Hook para pesquisar e gerir dados educacionais
 */
export function useEducationData() {
    
    // Obter lista de distritos únicos
    const getDistricts = useCallback(async (): Promise<string[]> => {
        const { data, error } = await supabase
            .from('schools')
            .select('district')
            .not('district', 'is', null)
            .order('district');

        if (error) {
            console.error('Erro ao obter distritos:', error);
            return [];
        }

        // Extrair valores únicos
        const unique = [...new Set(data?.map(d => d.district).filter(Boolean))] as string[];
        return unique;
    }, []);

    // Obter lista de concelhos por distrito
    const getMunicipalities = useCallback(async (district?: string): Promise<string[]> => {
        let query = supabase
            .from('schools')
            .select('municipality')
            .not('municipality', 'is', null);

        if (district) {
            query = query.eq('district', district);
        }

        const { data, error } = await query.order('municipality');

        if (error) {
            console.error('Erro ao obter concelhos:', error);
            return [];
        }

        const unique = [...new Set(data?.map(d => d.municipality).filter(Boolean))] as string[];
        return unique;
    }, []);

    // Obter lista de distritos únicos das UNIVERSIDADES
    const getUniversityDistricts = useCallback(async (): Promise<string[]> => {
        const { data, error } = await supabase
            .from('universities')
            .select('district')
            .not('district', 'is', null)
            .order('district');

        if (error) {
            console.error('Erro ao obter distritos de universidades:', error);
            return [];
        }

        const unique = [...new Set(data?.map(d => d.district).filter(Boolean))] as string[];
        return unique;
    }, []);

    // Pesquisar escolas - AGORA funciona sem query (mostra todas com filtros)
    const searchSchools = useCallback(async (
        query: string, 
        cycle?: '2º Ciclo' | '3º Ciclo' | 'Secundário',
        district?: string,
        municipality?: string
    ): Promise<{ id: string; label: string; sublabel?: string }[]> => {
        let queryBuilder = supabase
            .from('schools')
            .select('id, name, district, municipality, cycles')
            .order('name')
            .limit(50);

        // Pesquisa por nome (se tiver texto)
        if (query && query.length >= 2) {
            queryBuilder = queryBuilder.ilike('name', `%${query}%`);
        }

        // Filtrar por ciclo se especificado
        if (cycle) {
            queryBuilder = queryBuilder.ilike('cycles', `%${cycle}%`);
        }

        // Filtrar por distrito
        if (district) {
            queryBuilder = queryBuilder.eq('district', district);
        }

        // Filtrar por concelho
        if (municipality) {
            queryBuilder = queryBuilder.eq('municipality', municipality);
        }

        const { data, error } = await queryBuilder;

        if (error) {
            console.error('Erro ao pesquisar escolas:', error);
            return [];
        }

        return (data || []).map(school => ({
            id: school.id,
            label: school.name,
            sublabel: [school.municipality, school.district].filter(Boolean).join(', '),
        }));
    }, []);

    // Pesquisar universidades - AGORA funciona sem query e usa district
    const searchUniversities = useCallback(async (
        query: string,
        district?: string
    ): Promise<{ id: string; label: string; sublabel?: string }[]> => {
        let queryBuilder = supabase
            .from('universities')
            .select('id, name, type, district')
            .order('name')
            .limit(50);

        if (query && query.length >= 2) {
            queryBuilder = queryBuilder.ilike('name', `%${query}%`);
        }

        // Filtrar por distrito se especificado
        if (district) {
            queryBuilder = queryBuilder.eq('district', district);
        }

        const { data, error } = await queryBuilder;

        if (error) {
            console.error('Erro ao pesquisar universidades:', error);
            return [];
        }

        return (data || []).map(uni => ({
            id: uni.id,
            label: uni.name,
            sublabel: [uni.type, uni.district].filter(Boolean).join(' • '),
        }));
    }, []);

    // Pesquisar cursos - AGORA com organic_unit e level
    const searchDegrees = useCallback(async (
        query: string,
        universityId?: string
    ): Promise<{ id: string; label: string; sublabel?: string }[]> => {
        let queryBuilder = supabase
            .from('degrees')
            .select('id, code, name, university_id, organic_unit, level')
            .order('name')
            .limit(100);

        // Pesquisa por nome (se tiver texto)
        if (query && query.length >= 2) {
            queryBuilder = queryBuilder.ilike('name', `%${query}%`);
        }

        // SEMPRE filtrar por universidade se especificada
        if (universityId) {
            queryBuilder = queryBuilder.eq('university_id', universityId);
        }

        const { data, error } = await queryBuilder;

        if (error) {
            console.error('Erro ao pesquisar cursos:', error);
            return [];
        }

        return (data || []).map(degree => {
            // Construir sublabel com informações disponíveis
            const parts = [];
            if (degree.level) parts.push(degree.level);
            if (degree.organic_unit) parts.push(degree.organic_unit);
            if (degree.code) parts.push(`Cód: ${degree.code}`);
            
            return {
                id: degree.id,
                label: degree.name,
                sublabel: parts.length > 0 ? parts.join(' • ') : undefined,
            };
        });
    }, []);

    // Anos disponíveis por nível
    const getYearsForLevel = (level: EducationLevel): number[] => {
        switch (level) {
            case 'basic_2':
                return [5, 6];
            case 'basic_3':
                return [7, 8, 9];
            case 'secondary':
                return [10, 11, 12];
            case 'university':
                return [1, 2, 3, 4, 5, 6];
            default:
                return [];
        }
    };

    // Áreas do secundário
    const secondaryAreas = [
        { id: 'ciencias', label: 'Ciências e Tecnologias' },
        { id: 'socioeconomicas', label: 'Ciências Socioeconómicas' },
        { id: 'humanidades', label: 'Línguas e Humanidades' },
        { id: 'artes', label: 'Artes Visuais' },
        { id: 'profissional', label: 'Curso Profissional' },
    ];

    return {
        searchSchools,
        searchUniversities,
        searchDegrees,
        getDistricts,
        getMunicipalities,
        getUniversityDistricts,
        getYearsForLevel,
        secondaryAreas,
    };
}

/**
 * Guardar dados de educação do utilizador
 */
export async function saveUserEducation(
    userId: string,
    data: {
        level: EducationLevel;
        schoolId?: string;
        year?: number;
        secondaryCourseArea?: string;
        universityId?: string;
        degreeId?: string;
        uniYear?: number;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        // Mapear level diretamente (já corresponde ao enum)
        // Construir objeto apenas com campos relevantes
        const educationData: Record<string, any> = {
            user_id: userId,
            level: data.level, // basic_2, basic_3, secondary, university
        };

        // Campos para básico/secundário
        if (data.level === 'basic_2' || data.level === 'basic_3' || data.level === 'secondary') {
            if (data.schoolId) educationData.school_id = data.schoolId;
            if (data.year) educationData.year = data.year;
        }

        // Campo específico do secundário
        if (data.level === 'secondary' && data.secondaryCourseArea) {
            educationData.secondary_course_area = data.secondaryCourseArea;
        }

        // Campos para universitário
        if (data.level === 'university') {
            if (data.universityId) educationData.university_id = data.universityId;
            if (data.degreeId) educationData.degree_id = data.degreeId;
            if (data.uniYear) educationData.uni_year = data.uniYear;
        }

        // Upsert (insert ou update se já existir)
        const { error } = await supabase
            .from('user_education')
            .upsert(educationData, { onConflict: 'user_id' });

        if (error) {
            console.error('Erro ao guardar educação:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error('Erro inesperado:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Obter dados de educação do utilizador
 */
export async function getUserEducation(userId: string) {
    const { data, error } = await supabase
        .from('user_education')
        .select(`
            *,
            school:schools(*),
            university:universities(*),
            degree:degrees(*)
        `)
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Erro ao obter educação:', error);
    }

    return data;
}
