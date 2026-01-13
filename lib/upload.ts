import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const BUCKET_NAME = 'chat-files';

// Configurações de compressão
const MAX_WIDTH = 1200; // Largura máxima em pixels
const MAX_HEIGHT = 1200; // Altura máxima em pixels
const JPEG_QUALITY = 0.7; // Qualidade JPEG (0.7 = 70%, bom equilíbrio)

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
 * Comprime uma imagem reduzindo tamanho e qualidade
 * Ex: 4MB → ~200KB mantendo boa qualidade visual
 * NOTA: Só funciona em mobile (iOS/Android), não na web
 */
async function compressImage(uri: string): Promise<{ uri: string; width: number; height: number }> {
    // Na web, o módulo nativo não existe - saltar compressão
    if (Platform.OS === 'web') {
        console.log('⚠️ Compressão não disponível na web, usando original');
        return { uri, width: 0, height: 0 };
    }

    try {
        console.log('🗜️ A comprimir imagem...');
        
        // Import dinâmico para evitar crash na web
        const ImageManipulator = await import('expo-image-manipulator');
        
        // Redimensionar se for maior que o máximo
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: MAX_WIDTH, height: MAX_HEIGHT } }],
            {
                compress: JPEG_QUALITY, // 70% qualidade
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );

        console.log(`✅ Imagem comprimida: ${result.width}x${result.height}`);
        return result;
    } catch (err) {
        console.warn('⚠️ Compressão falhou, usando original:', err);
        return { uri, width: 0, height: 0 };
    }
}

/**
 * Faz upload de uma imagem para o Supabase Storage
 * AUTOMATICAMENTE comprime imagens grandes antes do upload
 * @param uri - URI local da imagem (do ImagePicker)
 * @param userId - ID do utilizador (para organizar por pasta)
 * @param skipCompression - Se true, não comprime (útil para avatares pequenos)
 * @returns URL pública da imagem ou null se falhar
 */
/**
 * Faz upload de uma imagem para o Supabase Storage
 * AUTOMATICAMENTE comprime imagens grandes antes do upload
 * @param uri - URI local da imagem (do ImagePicker)
 * @param userId - ID do utilizador (para organizar por pasta)
 * @param bucketName - Nome do bucket (default: 'chat-files')
 * @param skipCompression - Se true, não comprime (útil para avatares pequenos)
 * @returns URL pública da imagem ou null se falhar
 */
export async function uploadImage(
    uri: string, 
    userId: string, 
    bucketName: string = 'chat-files',
    skipCompression: boolean = false
): Promise<string | null> {
    try {
        console.log(`📤 A fazer upload para ${bucketName}...`);

        // 1. Comprimir imagem (se não for para saltar)
        let finalUri = uri;
        if (!skipCompression) {
            const compressed = await compressImage(uri);
            finalUri = compressed.uri;
        }

        // 2. Ler o ficheiro (Web vs Native)
        let fileBody;
        if (Platform.OS === 'web') {
            const response = await fetch(finalUri);
            fileBody = await response.blob();
        } else {
            const base64 = await FileSystem.readAsStringAsync(finalUri, {
                encoding: 'base64',
            });
            fileBody = decode(base64);
        }

        // Log do tamanho aproximado
        const sizeKB = Platform.OS === 'web' 
            ? Math.round((fileBody as Blob).size / 1024) 
            : Math.round(((fileBody as ArrayBuffer).byteLength) / 1024);
            
        console.log(`📊 Tamanho do ficheiro: ~${sizeKB}KB`);

        // 3. Gerar nome do ficheiro (sempre .jpg após compressão)
        const extension = skipCompression ? getExtension(uri) : 'jpg';
        const fileName = generateFileName(userId, extension);

        // 4. Upload para o Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, fileBody, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (error) {
            console.error('❌ Erro no upload:', error);
            return null;
        }

        console.log('✅ Upload completo:', data.path);

        // 5. Obter URL pública
        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
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
 * @param bucketName - Nome do bucket (default: 'chat-files')
 * @returns true se apagou com sucesso
 */
export async function deleteImage(url: string, bucketName: string = 'chat-files'): Promise<boolean> {
    try {
        // Extrair o path do URL
        const bucketUrl = supabase.storage.from(bucketName).getPublicUrl('').data.publicUrl;
        const path = url.replace(bucketUrl, '');

        if (!path) {
            console.error('Path inválido para apagar');
            return false;
        }

        const { error } = await supabase.storage
            .from(bucketName)
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
