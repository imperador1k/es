import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const BUCKET_NAME = 'chat-files';

/**
 * Gera um nome único para o ficheiro
 */
function generateFileName(userId: string, extension: string = 'jpg'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${userId}/${timestamp}_${random}.${extension}`;
}

/**
 * Extrai a extensão de um URI
 */
function getExtension(uri: string): string {
    const match = uri.match(/\.(\w+)$/);
    return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Faz upload de uma imagem para o Supabase Storage
 * @param uri - URI local da imagem (do ImagePicker)
 * @param userId - ID do utilizador (para organizar por pasta)
 * @returns URL pública da imagem ou null se falhar
 */
export async function uploadImage(uri: string, userId: string): Promise<string | null> {
    try {
        console.log('📤 A fazer upload da imagem...');

        // 1. Ler o ficheiro como Base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });

        // 2. Gerar nome do ficheiro
        const extension = getExtension(uri);
        const fileName = generateFileName(userId, extension);

        // 3. Determinar o Content-Type
        const contentType = extension === 'png' ? 'image/png'
            : extension === 'gif' ? 'image/gif'
                : 'image/jpeg';

        // 4. Upload para o Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, decode(base64), {
                contentType,
                upsert: false
            });

        if (error) {
            console.error('❌ Erro no upload:', error);
            return null;
        }

        console.log('✅ Upload completo:', data.path);

        // 5. Obter URL pública
        const { data: publicUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

        console.log('🔗 URL pública:', publicUrlData.publicUrl);

        return publicUrlData.publicUrl;
    } catch (err) {
        console.error('❌ Erro inesperado no upload:', err);
        return null;
    }
}

/**
 * Apaga uma imagem do Supabase Storage
 * @param url - URL pública da imagem
 * @returns true se apagou com sucesso
 */
export async function deleteImage(url: string): Promise<boolean> {
    try {
        // Extrair o path do URL
        const bucketUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl('').data.publicUrl;
        const path = url.replace(bucketUrl, '');

        if (!path) {
            console.error('Path inválido para apagar');
            return false;
        }

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path]);

        if (error) {
            console.error('❌ Erro ao apagar imagem:', error);
            return false;
        }

        console.log('🗑️ Imagem apagada:', path);
        return true;
    } catch (err) {
        console.error('❌ Erro inesperado ao apagar:', err);
        return false;
    }
}
