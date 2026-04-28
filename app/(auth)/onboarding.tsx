import { supabase } from '@/lib/supabase';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { uploadImage } from '@/lib/upload';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions
} from 'react-native';
import Animated, { FadeInDown, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Step = 'welcome' | 'username' | 'photo' | 'done';

export default function OnboardingScreen() {
    const { user, refreshSession } = useAuthContext();
    const { showAlert } = useAlert();
    const { width, height } = useWindowDimensions();

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
            showAlert({ title: 'Erro', message: 'Não foi possível selecionar imagem' });
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
                .upsert({
                    id: user.id,
                    username: username.toLowerCase(),
                    full_name: fullName || null,
                    avatar_url: avatarUrl,
                }, { onConflict: 'id' });

            if (updateError) throw updateError;

            setStep('done');
            await refreshSession(); // Refresh session to trigger AuthProvider redirect check

            // Ir para setup educacional (Reduzido para 500ms para ser mais fluido)
            setTimeout(() => {
                router.replace('/(auth)/education-setup' as any);
            }, 500);
        } catch (error: any) {
            console.error('Onboarding error:', error);
            showAlert({ title: 'Erro', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    // Skip foto
    const handleSkipPhoto = () => {
        handleFinish();
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F1115', '#161922', '#0A0B0E']}
                style={StyleSheet.absoluteFill}
            />

            {/* Background Mesh Gradient Simulation */}
            <View style={styles.meshContainer}>
                <View style={[styles.meshOrb, { top: -100, left: -50, backgroundColor: COLORS.accent.primary, opacity: 0.15 }]} />
                <View style={[styles.meshOrb, { bottom: -100, right: -50, backgroundColor: '#7C3AED', opacity: 0.1 }]} />
            </View>

            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Step: Welcome */}
                        {step === 'welcome' && (
                            <Animated.View
                                entering={FadeInDown.duration(600).springify()}
                                exiting={FadeOutLeft.duration(300)}
                                style={styles.stepContainer}
                            >
                                <View style={styles.iconRing}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="sparkles" size={48} color={COLORS.text.inverse} />
                                    </View>
                                </View>

                                <Text style={styles.title}>Bem-vindo à Escola+! 🎉</Text>
                                <Text style={styles.subtitle}>
                                    A tua nova experiência de aprendizagem começa aqui. Vamos configurar o teu perfil.
                                </Text>

                                <Pressable style={styles.primaryButton} onPress={() => setStep('username')}>
                                    <LinearGradient
                                        colors={COLORS.brand.gradient as [string, string]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientButton}
                                    >
                                        <Text style={styles.primaryButtonText}>Começar</Text>
                                        <Ionicons name="arrow-forward" size={20} color={COLORS.text.primary} />
                                    </LinearGradient>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* Step: Username */}
                        {step === 'username' && (
                            <Animated.View
                                entering={FadeInDown.duration(600).springify()}
                                exiting={FadeOutLeft.duration(300)}
                                style={styles.stepContainer}
                            >
                                <View style={styles.header}>
                                    <Text style={styles.stepLabel}>Passo 1 de 2</Text>
                                    <Text style={styles.title}>Quem és tu?</Text>
                                    <Text style={styles.subtitle}>
                                        Escolhe um username único para te identificares na comunidade.
                                    </Text>
                                </View>

                                <View style={styles.card}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Username *</Text>
                                        <View style={[styles.inputWrapper, { borderColor: error ? COLORS.error : COLORS.surfaceMuted }]}>
                                            <Text style={styles.inputPrefix}>@</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="teu_username"
                                                placeholderTextColor={COLORS.text.tertiary}
                                                value={username}
                                                onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                maxLength={20}
                                            />
                                            {checkingUsername && (
                                                <ActivityIndicator size="small" color={COLORS.accent.primary} style={{ marginRight: SPACING.md }} />
                                            )}
                                            {username.length >= 3 && !checkingUsername && !error && (
                                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} style={{ marginRight: SPACING.md }} />
                                            )}
                                        </View>
                                        <Text style={styles.inputHint}>Mínimo 3 caracteres. Só letras, números e _</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Nome completo (opcional)</Text>
                                        <View style={styles.inputWrapper}>
                                            <Ionicons name="person-outline" size={20} color={COLORS.text.tertiary} style={{ marginLeft: SPACING.md }} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Como te devemos chamar?"
                                                placeholderTextColor={COLORS.text.tertiary}
                                                value={fullName}
                                                onChangeText={setFullName}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {error ? (
                                    <Animated.View entering={FadeInDown} style={styles.errorContainer}>
                                        <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </Animated.View>
                                ) : null}

                                <Pressable
                                    style={[styles.primaryButton, username.length < 3 && styles.disabledButton]}
                                    onPress={handleSaveUsername}
                                    disabled={username.length < 3}
                                >
                                    <LinearGradient
                                        colors={(username.length < 3 ? [COLORS.surfaceMuted, COLORS.surfaceMuted] : COLORS.brand.gradient) as [string, string]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientButton}
                                    >
                                        <Text style={[styles.primaryButtonText, username.length < 3 && { color: COLORS.text.tertiary }]}>Continuar</Text>
                                        <Ionicons name="arrow-forward" size={20} color={username.length < 3 ? COLORS.text.tertiary : COLORS.text.primary} />
                                    </LinearGradient>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* Step: Photo */}
                        {step === 'photo' && (
                            <Animated.View
                                entering={FadeInDown.duration(600).springify()}
                                exiting={FadeOutLeft.duration(300)}
                                style={styles.stepContainer}
                            >
                                <View style={styles.header}>
                                    <Text style={styles.stepLabel}>Passo 2 de 2</Text>
                                    <Text style={styles.title}>Mostra a tua cara!</Text>
                                    <Text style={styles.subtitle}>
                                        Adiciona uma foto para que os teus amigos te possam reconhecer.
                                    </Text>
                                </View>

                                <Pressable style={styles.avatarPicker} onPress={handlePickImage} disabled={loading}>
                                    {loading ? (
                                        <ActivityIndicator size="large" color={COLORS.accent.primary} />
                                    ) : avatarUrl ? (
                                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <View style={styles.avatarIconBg}>
                                                <Ionicons name="camera" size={32} color={COLORS.accent.primary} />
                                            </View>
                                            <Text style={styles.avatarHint}>Toca para escolher</Text>
                                        </View>
                                    )}
                                </Pressable>

                                {avatarUrl && (
                                    <Pressable style={styles.changePhotoButton} onPress={handlePickImage}>
                                        <Text style={styles.changePhotoText}>Mudar foto</Text>
                                    </Pressable>
                                )}

                                <View style={styles.footerActions}>
                                    <Pressable style={styles.primaryButton} onPress={handleFinish} disabled={loading}>
                                        <LinearGradient
                                            colors={COLORS.brand.gradient as [string, string]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.gradientButton}
                                        >
                                            {loading ? (
                                                <ActivityIndicator color={COLORS.text.primary} />
                                            ) : (
                                                <>
                                                    <Text style={styles.primaryButtonText}>Concluir</Text>
                                                    <Ionicons name="checkmark" size={20} color={COLORS.text.primary} />
                                                </>
                                            )}
                                        </LinearGradient>
                                    </Pressable>

                                    {!avatarUrl && (
                                        <Pressable style={styles.skipButton} onPress={handleSkipPhoto}>
                                            <Text style={styles.skipButtonText}>Saltar por agora</Text>
                                        </Pressable>
                                    )}
                                </View>
                            </Animated.View>
                        )}

                        {/* Step: Done */}
                        {step === 'done' && (
                            <Animated.View
                                entering={FadeInDown.duration(600).springify()}
                                style={styles.stepContainer}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: COLORS.success, width: 120, height: 120, borderRadius: 60, marginBottom: SPACING.xl }]}>
                                    <Ionicons name="checkmark" size={60} color={COLORS.text.primary} />
                                </View>
                                <Text style={styles.title}>Tudo pronto! 🚀</Text>
                                <Text style={styles.subtitle}>
                                    O teu perfil foi criado com sucesso. A preparar o teu ambiente...
                                </Text>
                                <ActivityIndicator size="large" color={COLORS.accent.primary} style={{ marginTop: SPACING.xl }} />
                            </Animated.View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    meshContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    meshOrb: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        filter: 'blur(80px)', // Works on web, native needs SVG blur or just opacity
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING['3xl'],
    },
    stepContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },

    // Header Components
    header: {
        alignItems: 'center',
        marginBottom: SPACING['2xl'],
        width: '100%',
    },
    iconRing: {
        padding: SPACING.md,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        marginBottom: SPACING.xl,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.glow,
    },
    stepLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.accent.light,
        fontFamily: TYPOGRAPHY.family.semibold,
        marginBottom: SPACING.md,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: TYPOGRAPHY.size['3xl'],
        fontFamily: TYPOGRAPHY.family.bold,
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: SPACING.md,
        fontFamily: TYPOGRAPHY.family.regular,
    },

    // Card & Inputs
    card: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS['2xl'],
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceElevated,
        marginBottom: SPACING.xl,
    },
    inputGroup: {
        width: '100%',
        marginBottom: SPACING.lg,
    },
    inputLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontFamily: TYPOGRAPHY.family.medium,
        color: COLORS.text.secondary,
        marginBottom: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.surfaceMuted,
        height: 56,
        overflow: 'hidden',
    },
    inputPrefix: {
        fontSize: TYPOGRAPHY.size.md,
        color: COLORS.text.tertiary,
        marginLeft: SPACING.lg,
        marginRight: SPACING.xs,
        fontFamily: TYPOGRAPHY.family.medium,
    },
    input: {
        flex: 1,
        height: '100%',
        paddingHorizontal: SPACING.md,
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        fontFamily: TYPOGRAPHY.family.medium,
    },
    inputHint: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginTop: SPACING.xs,
        marginLeft: SPACING.xs,
    },

    // Avatar Picker
    avatarPicker: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        borderWidth: 2,
        borderColor: COLORS.surfaceElevated,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    avatarHint: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        fontFamily: TYPOGRAPHY.family.medium,
    },
    changePhotoButton: {
        marginBottom: SPACING.xl,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.full,
    },
    changePhotoText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.primary,
        fontFamily: TYPOGRAPHY.family.medium,
    },

    // Buttons
    primaryButton: {
        width: '100%',
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
        width: '100%',
    },
    primaryButtonText: {
        fontSize: TYPOGRAPHY.size.md,
        fontFamily: TYPOGRAPHY.family.bold,
        color: COLORS.text.primary,
    },
    disabledButton: {
        opacity: 1,
        ...SHADOWS.none,
    },

    // Actions
    footerActions: {
        width: '100%',
        gap: SPACING.lg,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    skipButtonText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.text.tertiary,
        fontFamily: TYPOGRAPHY.family.medium,
    },

    // Error
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.lg,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    errorText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.error,
        flex: 1,
        fontFamily: TYPOGRAPHY.family.medium,
    },
});
