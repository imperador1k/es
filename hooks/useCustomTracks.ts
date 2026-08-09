import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface UserTrack {
    id: string;
    user_id: string;
    name: string;
    url: string;
    size_bytes: number;
    created_at: string;
}

const BUCKET = 'music';
const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'webm', 'opus', 'mp4', 'mpeg'];

function getExtension(name: string): string {
    const match = name.toLowerCase().match(/\.(\w+)$/);
    return match ? match[1] : 'mp3';
}

export function useCustomTracks(userId?: string) {
    const [tracks, setTracks] = useState<UserTrack[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchTracks = useCallback(async () => {
        if (!userId) {
            setTracks([]);
            return;
        }
        try {
            const { data, error } = await supabase
                .from('user_tracks')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setTracks((data || []) as UserTrack[]);
        } catch (err) {
            console.error('Erro ao carregar músicas:', err);
        }
    }, [userId]);

    useEffect(() => {
        fetchTracks();
    }, [fetchTracks]);

    const pickAndUpload = useCallback(async (): Promise<UserTrack | null> => {
        if (!userId) return null;
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: false,
            });
            if (result.canceled || !result.assets[0]) return null;

            const asset = result.assets[0];
            const ext = getExtension(asset.name);
            if (!AUDIO_EXTENSIONS.includes(ext)) {
                console.warn('Formato de áudio não suportado:', ext);
                return null;
            }

            setLoading(true);

            let fileBody: Blob | ArrayBuffer;
            if (Platform.OS === 'web') {
                const response = await fetch(asset.uri);
                fileBody = await response.blob();
            } else {
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: 'base64',
                });
                fileBody = decode(base64);
            }

            const sizeBytes = Platform.OS === 'web'
                ? (fileBody as Blob).size
                : (fileBody as ArrayBuffer).byteLength;

            if (sizeBytes > MAX_SIZE_BYTES) {
                console.warn('Ficheiro demasiado grande (máx. 50MB)');
                return null;
            }

            const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(fileName, fileBody, {
                    contentType: asset.mimeType || 'audio/mpeg',
                    upsert: true,
                });

            if (uploadError) {
                console.error('Erro no upload:', uploadError);
                return null;
            }

            const { data: publicUrlData } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(fileName);

            const { data, error } = await supabase
                .from('user_tracks')
                .insert({
                    user_id: userId,
                    name: asset.name,
                    url: publicUrlData.publicUrl,
                    size_bytes: sizeBytes,
                })
                .select()
                .single();

            if (error) {
                console.error('Erro ao guardar música:', error);
                return null;
            }

            setTracks(prev => [data as UserTrack, ...prev]);
            return data as UserTrack;
        } catch (err) {
            console.error('Erro inesperado no upload:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const deleteTrack = useCallback(async (track: UserTrack): Promise<boolean> => {
        try {
            const bucketUrl = supabase.storage.from(BUCKET).getPublicUrl('').data.publicUrl;
            const path = track.url.replace(bucketUrl, '');

            if (path && path !== track.url) {
                await supabase.storage.from(BUCKET).remove([path]);
            }

            const { error } = await supabase
                .from('user_tracks')
                .delete()
                .eq('id', track.id);

            if (error) throw error;
            setTracks(prev => prev.filter(t => t.id !== track.id));
            return true;
        } catch (err) {
            console.error('Erro ao apagar música:', err);
            return false;
        }
    }, []);

    return {
        tracks,
        loading,
        refresh: fetchTracks,
        pickAndUpload,
        deleteTrack,
    };
}
