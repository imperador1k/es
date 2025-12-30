import { supabase } from '@/lib/supabase';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { uploadImage } from '@/lib/upload';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 'welcome' | 'username' | 'photo' | 'done';

export default function OnboardingScreen() {
    const { user } = useAuthContext();
    const [step, setStep] = useState<Step>('welcome');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkingUsername, setCheckingUsername] = useState(false);

    // Verificar se username está disponível
    const checkUsername = async (value: string): Promise<boolean> => {
        if (value.length < 3) return false;

        setCheckingUsername(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', value.toLowerCase())
                .neq('id', user?.id || '')
                .single();

            setCheckingUsername(false);
            return !data; // Se não encontrar, está disponível
        } catch {
            setCheckingUsername(false);
            return true; // Assume disponível se erro
        }
    };

    // Escolher foto
    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0] && user?.id) {
                setLoading(true);
                const url = await uploadImage(result.assets[0].uri, user.id);
                if (url) {
                    setAvatarUrl(url);
                }
                setLoading(false);
            }
        } catch (err) {
            console.error('Erro ao escolher imagem:', err);
            setLoading(false);
        }
    };

    // Guardar username
    const handleSaveUsername = async () => {
        setError('');

        if (username.length < 3) {
            setError('Username deve ter pelo menos 3 caracteres');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setError('Username só pode ter letras, números e _');
            return;
        }

        const available = await checkUsername(username);
        if (!available) {
            setError('Este username já está a ser usado');
            return;
        }

        setStep('photo');
    };

    // Guardar tudo e finalizar
    const handleFinish = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    username: username.toLowerCase(),
                    full_name: fullName || null,
                    avatar_url: avatarUrl,
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setStep('done');

            // Ir para setup educacional
            setTimeout(() => {
                router.replace('/(auth)/education-setup' as any);
            }, 1500);
        } catch (err: any) {
            console.error('Erro ao guardar perfil:', err);
            Alert.alert('Erro', 'Não foi possível guardar o perfil.');
        } finally {
            setLoading(false);
        }
    };

    // Skip foto
    const handleSkipPhoto = () => {
        handleFinish();
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Step: Welcome */}
                    {step === 'welcome' && (
                        <View style={styles.stepContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="sparkles" size={48} color={colors.accent.primary} />
                            </View>
                            <Text style={styles.title}>Bem-vindo à Escola+! 🎉</Text>
                            <Text style={styles.subtitle}>
                                Vamos configurar o teu perfil para começares a tua jornada de aprendizagem.
                            </Text>
                            <Pressable style={styles.primaryButton} onPress={() => setStep('username')}>
                                <Text style={styles.primaryButtonText}>Começar</Text>
                                <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
                            </Pressable>
                        </View>
                    )}

                    {/* Step: Username */}
                    {step === 'username' && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepLabel}>Passo 1 de 2</Text>
                            <Text style={styles.title}>Escolhe o teu username</Text>
                            <Text style={styles.subtitle}>
                                É assim que os outros te vão encontrar na app.
                            </Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Username *</Text>
                                <View style={styles.usernameInputWrapper}>
                                    <Text style={styles.usernamePrefix}>@</Text>
                                    <TextInput
                                        style={styles.usernameInput}
                                        placeholder="teu_username"
                                        placeholderTextColor={colors.text.tertiary}
                                        value={username}
                                        onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        maxLength={20}
                                    />
                                    {checkingUsername && (
                                        <ActivityIndicator size="small" color={colors.accent.primary} />
                                    )}
                                </View>
                                <Text style={styles.inputHint}>Mínimo 3 caracteres. Só letras, números e _</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Nome completo (opcional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="O teu nome"
                                    placeholderTextColor={colors.text.tertiary}
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>

                            {error ? (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={16} color={colors.danger.primary} />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            <Pressable
                                style={[styles.primaryButton, username.length < 3 && styles.disabledButton]}
                                onPress={handleSaveUsername}
                                disabled={username.length < 3}
                            >
                                <Text style={styles.primaryButtonText}>Continuar</Text>
                                <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
                            </Pressable>
                        </View>
                    )}

                    {/* Step: Photo */}
                    {step === 'photo' && (
                        <View style={styles.stepContainer}>
                            <Text style={styles.stepLabel}>Passo 2 de 2</Text>
                            <Text style={styles.title}>Adiciona uma foto</Text>
                            <Text style={styles.subtitle}>
                                Ajuda os teus amigos a reconhecer-te! Podes também saltar este passo.
                            </Text>

                            <Pressable style={styles.avatarPicker} onPress={handlePickImage} disabled={loading}>
                                {loading ? (
                                    <ActivityIndicator size="large" color={colors.accent.primary} />
                                ) : avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                                ) : (
                                    <>
                                        <View style={styles.avatarPlaceholder}>
                                            <Ionicons name="camera" size={32} color={colors.accent.primary} />
                                        </View>
                                        <Text style={styles.avatarHint}>Toca para escolher uma foto</Text>
                                    </>
                                )}
                            </Pressable>

                            {avatarUrl && (
                                <Pressable style={styles.changePhotoButton} onPress={handlePickImage}>
                                    <Text style={styles.changePhotoText}>Mudar foto</Text>
                                </Pressable>
                            )}

                            <View style={styles.photoActions}>
                                <Pressable style={styles.primaryButton} onPress={handleFinish} disabled={loading}>
                                    {loading ? (
                                        <ActivityIndicator color={colors.text.inverse} />
                                    ) : (
                                        <>
                                            <Text style={styles.primaryButtonText}>Concluir</Text>
                                            <Ionicons name="checkmark" size={20} color={colors.text.inverse} />
                                        </>
                                    )}
                                </Pressable>

                                {!avatarUrl && (
                                    <Pressable style={styles.skipButton} onPress={handleSkipPhoto}>
                                        <Text style={styles.skipButtonText}>Saltar por agora</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Step: Done */}
                    {step === 'done' && (
                        <View style={styles.stepContainer}>
                            <View style={styles.successIconContainer}>
                                <Ionicons name="checkmark-circle" size={80} color={colors.success.primary} />
                            </View>
                            <Text style={styles.title}>Tudo pronto! 🚀</Text>
                            <Text style={styles.subtitle}>
                                O teu perfil está configurado. Bem-vindo à Escola+!
                            </Text>
                            <ActivityIndicator size="large" color={colors.accent.primary} style={{ marginTop: spacing.xl }} />
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing['2xl'],
        paddingVertical: spacing['3xl'],
    },
    stepContainer: {
        alignItems: 'center',
    },

    // Icons
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    successIconContainer: {
        marginBottom: spacing.lg,
    },

    // Text
    stepLabel: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
        fontWeight: typography.weight.semibold,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    subtitle: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: spacing['2xl'],
    },

    // Inputs
    inputGroup: {
        width: '100%',
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    textInput: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
        ...shadows.sm,
    },
    usernameInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        ...shadows.sm,
    },
    usernamePrefix: {
        fontSize: typography.size.md,
        color: colors.text.tertiary,
        marginRight: spacing.xs,
    },
    usernameInput: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    inputHint: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },

    // Error
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.danger.light,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
        width: '100%',
    },
    errorText: {
        fontSize: typography.size.sm,
        color: colors.danger.primary,
        flex: 1,
    },

    // Avatar
    avatarPicker: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        borderWidth: 3,
        borderColor: colors.accent.light,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        marginBottom: spacing.sm,
    },
    avatarHint: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    changePhotoButton: {
        marginBottom: spacing.xl,
    },
    changePhotoText: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
        fontWeight: typography.weight.medium,
    },

    // Buttons
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent.primary,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing['2xl'],
        gap: spacing.sm,
        width: '100%',
        ...shadows.md,
    },
    primaryButtonText: {
        fontSize: typography.size.md,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
    disabledButton: {
        opacity: 0.5,
    },
    photoActions: {
        width: '100%',
        gap: spacing.md,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    skipButtonText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
});
