import { Autocomplete } from '@/components/ui/Autocomplete';
import { EducationLevel, saveUserEducation, useEducationData } from '@/hooks/useEducation';
import { borderRadius, colors, shadows, spacing, typography } from '@/lib/theme';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Tipos do formulário
interface EducationFormData {
    level: EducationLevel | null;
    school: { id: string; label: string } | null;
    year: number | null;
    secondaryArea: string | null;
    university: { id: string; label: string } | null;
    degree: { id: string; label: string } | null;
    uniYear: number | null;
}

type Step = 'level' | 'details' | 'saving';

// Configuração dos níveis - IDs correspondem ao ENUM na BD
const EDUCATION_LEVELS = [
    { id: 'basic_2' as const, label: '2º Ciclo', icon: 'school-outline', description: '5º e 6º ano' },
    { id: 'basic_3' as const, label: '3º Ciclo', icon: 'school-outline', description: '7º, 8º e 9º ano' },
    { id: 'secondary' as const, label: 'Secundário', icon: 'library-outline', description: '10º, 11º e 12º ano' },
    { id: 'university' as const, label: 'Ensino Superior', icon: 'ribbon-outline', description: 'Universidade ou Politécnico' },
];

export default function EducationSetupScreen() {
    const { user, refreshSession } = useAuthContext();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const {
        searchSchools,
        searchUniversities,
        searchDegrees,
        getDistricts,
        getMunicipalities,
        getUniversityDistricts,
        getYearsForLevel,
        secondaryAreas
    } = useEducationData();
    const [step, setStep] = useState<Step>('level');
    const [saving, setSaving] = useState(false);

    // Filtros de localização (Escolas)
    const [districts, setDistricts] = useState<string[]>([]);
    const [municipalities, setMunicipalities] = useState<string[]>([]);
    const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
    const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Filtros de localização (Universidades)
    const [uniDistricts, setUniDistricts] = useState<string[]>([]);
    const [selectedUniDistrict, setSelectedUniDistrict] = useState<string | null>(null);
    const [showUniFilters, setShowUniFilters] = useState(false);

    const { control, watch, setValue, handleSubmit, formState: { errors } } = useForm<EducationFormData>({
        defaultValues: {
            level: null,
            school: null,
            year: null,
            secondaryArea: null,
            university: null,
            degree: null,
            uniYear: null,
        },
    });

    const selectedLevel = watch('level');
    const selectedUniversity = watch('university');

    // Carregar distritos quando vai para detalhes (escolas)
    useEffect(() => {
        if (step === 'details' && (selectedLevel === 'basic_2' || selectedLevel === 'basic_3' || selectedLevel === 'secondary')) {
            getDistricts().then(setDistricts);
        }
    }, [step, selectedLevel, getDistricts]);

    // Carregar distritos quando vai para detalhes (universidades)
    useEffect(() => {
        if (step === 'details' && selectedLevel === 'university') {
            getUniversityDistricts().then(setUniDistricts);
        }
    }, [step, selectedLevel, getUniversityDistricts]);

    // Carregar concelhos quando seleciona distrito (escolas)
    useEffect(() => {
        if (selectedDistrict) {
            getMunicipalities(selectedDistrict).then(setMunicipalities);
            setSelectedMunicipality(null); // Reset concelho
            setValue('school', null); // Reset escola
        }
    }, [selectedDistrict, getMunicipalities, setValue]);

    // Reset universidade quando muda distrito de universidade
    useEffect(() => {
        if (selectedUniDistrict !== null) {
            setValue('university', null);
            setValue('degree', null);
        }
    }, [selectedUniDistrict, setValue]);

    // Progress percentage
    const getProgress = () => {
        if (step === 'level') return 0.33;
        if (step === 'details') return 0.66;
        return 1;
    };

    // Avançar para detalhes
    const handleLevelSelect = (level: EducationLevel) => {
        setValue('level', level);
        // Reset campos relacionados
        setValue('school', null);
        setValue('year', null);
        setValue('secondaryArea', null);
        setValue('university', null);
        setValue('degree', null);
        setValue('uniYear', null);
        // Reset filtros escolas
        setSelectedDistrict(null);
        setSelectedMunicipality(null);
        setShowFilters(false);
        // Reset filtros universidades
        setSelectedUniDistrict(null);
        setShowUniFilters(false);
        setStep('details');
    };

    // Pesquisa de escolas (com filtros)
    const handleSearchSchools = useCallback(async (query: string) => {
        if (!selectedLevel) return [];

        let cycle: '2º Ciclo' | '3º Ciclo' | 'Secundário' | undefined;
        if (selectedLevel === 'basic_2') cycle = '2º Ciclo';
        else if (selectedLevel === 'basic_3') cycle = '3º Ciclo';
        else if (selectedLevel === 'secondary') cycle = 'Secundário';

        return searchSchools(query, cycle, selectedDistrict || undefined, selectedMunicipality || undefined);
    }, [selectedLevel, selectedDistrict, selectedMunicipality, searchSchools]);

    // Pesquisa de universidades (com filtro de distrito)
    const handleSearchUniversities = useCallback(async (query: string) => {
        return searchUniversities(query, selectedUniDistrict || undefined);
    }, [selectedUniDistrict, searchUniversities]);

    // Pesquisa de cursos (filtrada por universidade)
    const handleSearchDegrees = useCallback(async (query: string) => {
        return searchDegrees(query, selectedUniversity?.id);
    }, [selectedUniversity, searchDegrees]);

    // Guardar e finalizar
    const onSubmit = async (data: EducationFormData) => {
        if (!user?.id || !data.level) return;

        setSaving(true);
        setStep('saving');

        const result = await saveUserEducation(user.id, {
            level: data.level,
            schoolId: data.school?.id,
            year: data.year || undefined,
            secondaryCourseArea: data.secondaryArea || undefined,
            universityId: data.university?.id,
            degreeId: data.degree?.id,
            uniYear: data.uniYear || undefined,
        });

        setSaving(false);

        if (result.success) {
            await refreshSession(); // Trigger redirect check
            // router.replace('/(tabs)'); // AuthProvider should handle this
        } else {
            showAlert({ title: 'Erro', message: result.error || 'Não foi possível guardar.' });
            setStep('details');
        }
    };

    // Voltar atrás
    const handleBack = () => {
        if (step === 'details') {
            setStep('level');
        }
    };

    // Verificar se pode continuar
    const canContinue = () => {
        if (!selectedLevel) return false;

        if (selectedLevel === 'basic_2' || selectedLevel === 'basic_3') {
            return !!watch('school') && !!watch('year');
        }
        if (selectedLevel === 'secondary') {
            return !!watch('school') && !!watch('year') && !!watch('secondaryArea');
        }
        if (selectedLevel === 'university') {
            return !!watch('university') && !!watch('degree') && !!watch('uniYear');
        }
        return false;
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Step: Select Level */}
                    {step === 'level' && (
                        <View style={styles.stepContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="school" size={48} color={colors.accent.primary} />
                            </View>
                            <Text style={styles.title}>Onde estudas?</Text>
                            <Text style={styles.subtitle}>
                                Escolhe o teu nível de ensino atual.
                            </Text>

                            <View style={styles.levelGrid}>
                                {EDUCATION_LEVELS.map((level) => (
                                    <Pressable
                                        key={level.id}
                                        style={styles.levelCard}
                                        onPress={() => handleLevelSelect(level.id)}
                                    >
                                        <View style={styles.levelIconWrapper}>
                                            <Ionicons name={level.icon as any} size={28} color={colors.accent.primary} />
                                        </View>
                                        <Text style={styles.levelLabel}>{level.label}</Text>
                                        <Text style={styles.levelDescription}>{level.description}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Step: Details based on level */}
                    {step === 'details' && selectedLevel && (
                        <View style={styles.stepContainer}>
                            <Pressable style={styles.backButton} onPress={handleBack}>
                                <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
                                <Text style={styles.backButtonText}>Voltar</Text>
                            </Pressable>

                            <Text style={styles.title}>
                                {selectedLevel === 'university' ? 'Dados Universitários' : 'Dados Escolares'}
                            </Text>
                            <Text style={styles.subtitle}>
                                Preenche os detalhes do teu percurso.
                            </Text>

                            {/* Básico ou Secundário: Escola + Ano */}
                            {(selectedLevel === 'basic_2' || selectedLevel === 'basic_3' || selectedLevel === 'secondary') && (
                                <>
                                    {/* Filtros de Localização */}
                                    <Pressable
                                        style={styles.filterToggle}
                                        onPress={() => setShowFilters(!showFilters)}
                                    >
                                        <Ionicons name="filter-outline" size={18} color={colors.accent.primary} />
                                        <Text style={styles.filterToggleText}>
                                            {showFilters ? 'Esconder filtros' : 'Filtrar por localização'}
                                        </Text>
                                        <Ionicons
                                            name={showFilters ? 'chevron-up' : 'chevron-down'}
                                            size={16}
                                            color={colors.text.tertiary}
                                        />
                                    </Pressable>

                                    {showFilters && (
                                        <View style={styles.filtersContainer}>
                                            {/* Distrito */}
                                            <View style={styles.filterGroup}>
                                                <Text style={styles.filterLabel}>Distrito</Text>
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={styles.filterChipsContainer}
                                                >
                                                    <Pressable
                                                        style={[
                                                            styles.filterChip,
                                                            !selectedDistrict && styles.filterChipActive,
                                                        ]}
                                                        onPress={() => setSelectedDistrict(null)}
                                                    >
                                                        <Text style={[
                                                            styles.filterChipText,
                                                            !selectedDistrict && styles.filterChipTextActive,
                                                        ]}>Todos</Text>
                                                    </Pressable>
                                                    {districts.map((district) => (
                                                        <Pressable
                                                            key={district}
                                                            style={[
                                                                styles.filterChip,
                                                                selectedDistrict === district && styles.filterChipActive,
                                                            ]}
                                                            onPress={() => setSelectedDistrict(district)}
                                                        >
                                                            <Text style={[
                                                                styles.filterChipText,
                                                                selectedDistrict === district && styles.filterChipTextActive,
                                                            ]}>{district}</Text>
                                                        </Pressable>
                                                    ))}
                                                </ScrollView>
                                            </View>

                                            {/* Concelho (só aparece se tiver distrito selecionado) */}
                                            {selectedDistrict && municipalities.length > 0 && (
                                                <View style={styles.filterGroup}>
                                                    <Text style={styles.filterLabel}>Concelho</Text>
                                                    <ScrollView
                                                        horizontal
                                                        showsHorizontalScrollIndicator={false}
                                                        contentContainerStyle={styles.filterChipsContainer}
                                                    >
                                                        <Pressable
                                                            style={[
                                                                styles.filterChip,
                                                                !selectedMunicipality && styles.filterChipActive,
                                                            ]}
                                                            onPress={() => setSelectedMunicipality(null)}
                                                        >
                                                            <Text style={[
                                                                styles.filterChipText,
                                                                !selectedMunicipality && styles.filterChipTextActive,
                                                            ]}>Todos</Text>
                                                        </Pressable>
                                                        {municipalities.map((municipality) => (
                                                            <Pressable
                                                                key={municipality}
                                                                style={[
                                                                    styles.filterChip,
                                                                    selectedMunicipality === municipality && styles.filterChipActive,
                                                                ]}
                                                                onPress={() => setSelectedMunicipality(municipality)}
                                                            >
                                                                <Text style={[
                                                                    styles.filterChipText,
                                                                    selectedMunicipality === municipality && styles.filterChipTextActive,
                                                                ]}>{municipality}</Text>
                                                            </Pressable>
                                                        ))}
                                                    </ScrollView>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    <Controller
                                        control={control}
                                        name="school"
                                        rules={{ required: 'Escola é obrigatória' }}
                                        render={({ field: { value, onChange } }) => (
                                            <Autocomplete
                                                label="Escola"
                                                placeholder="Pesquisa ou seleciona a tua escola..."
                                                value={value}
                                                onSelect={onChange}
                                                onSearch={handleSearchSchools}
                                                error={errors.school?.message}
                                            />
                                        )}
                                    />


                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Ano</Text>
                                        <View style={styles.yearSelector}>
                                            {getYearsForLevel(selectedLevel).map((year) => (
                                                <Pressable
                                                    key={year}
                                                    style={[
                                                        styles.yearButton,
                                                        watch('year') === year && styles.yearButtonActive,
                                                    ]}
                                                    onPress={() => setValue('year', year)}
                                                >
                                                    <Text style={[
                                                        styles.yearButtonText,
                                                        watch('year') === year && styles.yearButtonTextActive,
                                                    ]}>
                                                        {year}º
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                </>
                            )}

                            {/* Secundário: Área */}
                            {selectedLevel === 'secondary' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Área/Curso</Text>
                                    <View style={styles.areaSelector}>
                                        {secondaryAreas.map((area) => (
                                            <Pressable
                                                key={area.id}
                                                style={[
                                                    styles.areaButton,
                                                    watch('secondaryArea') === area.id && styles.areaButtonActive,
                                                ]}
                                                onPress={() => setValue('secondaryArea', area.id)}
                                            >
                                                <Text style={[
                                                    styles.areaButtonText,
                                                    watch('secondaryArea') === area.id && styles.areaButtonTextActive,
                                                ]}>
                                                    {area.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Superior: Universidade + Curso + Ano */}
                            {selectedLevel === 'university' && (
                                <>
                                    {/* Filtros de Localização (Universidades) */}
                                    <Pressable
                                        style={styles.filterToggle}
                                        onPress={() => setShowUniFilters(!showUniFilters)}
                                    >
                                        <Ionicons name="filter-outline" size={18} color={colors.accent.primary} />
                                        <Text style={styles.filterToggleText}>
                                            {showUniFilters ? 'Esconder filtros' : 'Filtrar por distrito'}
                                        </Text>
                                        <Ionicons
                                            name={showUniFilters ? 'chevron-up' : 'chevron-down'}
                                            size={16}
                                            color={colors.text.tertiary}
                                        />
                                    </Pressable>

                                    {showUniFilters && (
                                        <View style={styles.filtersContainer}>
                                            <View style={styles.filterGroup}>
                                                <Text style={styles.filterLabel}>Distrito</Text>
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={styles.filterChipsContainer}
                                                >
                                                    <Pressable
                                                        style={[
                                                            styles.filterChip,
                                                            !selectedUniDistrict && styles.filterChipActive,
                                                        ]}
                                                        onPress={() => setSelectedUniDistrict(null)}
                                                    >
                                                        <Text style={[
                                                            styles.filterChipText,
                                                            !selectedUniDistrict && styles.filterChipTextActive,
                                                        ]}>Todos</Text>
                                                    </Pressable>
                                                    {uniDistricts.map((district) => (
                                                        <Pressable
                                                            key={district}
                                                            style={[
                                                                styles.filterChip,
                                                                selectedUniDistrict === district && styles.filterChipActive,
                                                            ]}
                                                            onPress={() => setSelectedUniDistrict(district)}
                                                        >
                                                            <Text style={[
                                                                styles.filterChipText,
                                                                selectedUniDistrict === district && styles.filterChipTextActive,
                                                            ]}>{district}</Text>
                                                        </Pressable>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        </View>
                                    )}

                                    <Controller
                                        control={control}
                                        name="university"
                                        rules={{ required: 'Universidade é obrigatória' }}
                                        render={({ field: { value, onChange } }) => (
                                            <Autocomplete
                                                label="Universidade / Politécnico"
                                                placeholder="Pesquisa ou seleciona a tua instituição..."
                                                value={value}
                                                onSelect={(item) => {
                                                    onChange(item);
                                                    // Reset curso quando muda universidade
                                                    setValue('degree', null);
                                                }}
                                                onSearch={handleSearchUniversities}
                                                error={errors.university?.message}
                                            />
                                        )}
                                    />

                                    <Controller
                                        control={control}
                                        name="degree"
                                        rules={{ required: 'Curso é obrigatório' }}
                                        render={({ field: { value, onChange } }) => (
                                            <Autocomplete
                                                label="Curso"
                                                placeholder="Pesquisa o teu curso..."
                                                value={value}
                                                onSelect={onChange}
                                                onSearch={handleSearchDegrees}
                                                error={errors.degree?.message}
                                                disabled={!selectedUniversity}
                                            />
                                        )}
                                    />

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Ano do Curso</Text>
                                        <View style={styles.yearSelector}>
                                            {getYearsForLevel('university').map((year) => (
                                                <Pressable
                                                    key={year}
                                                    style={[
                                                        styles.yearButton,
                                                        watch('uniYear') === year && styles.yearButtonActive,
                                                    ]}
                                                    onPress={() => setValue('uniYear', year)}
                                                >
                                                    <Text style={[
                                                        styles.yearButtonText,
                                                        watch('uniYear') === year && styles.yearButtonTextActive,
                                                    ]}>
                                                        {year}º
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                </>
                            )}

                            {/* Botão Continuar */}
                            <Pressable
                                style={[styles.primaryButton, !canContinue() && styles.primaryButtonDisabled]}
                                onPress={handleSubmit(onSubmit)}
                                disabled={!canContinue() || saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color={colors.text.inverse} />
                                ) : (
                                    <>
                                        <Text style={styles.primaryButtonText}>Concluir</Text>
                                        <Ionicons name="checkmark" size={20} color={colors.text.inverse} />
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}

                    {/* Step: Saving */}
                    {step === 'saving' && (
                        <View style={styles.savingContainer}>
                            <ActivityIndicator size="large" color={colors.accent.primary} />
                            <Text style={styles.savingText}>A guardar...</Text>
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
    progressContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    progressBar: {
        height: 4,
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.accent.primary,
        borderRadius: 2,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl * 2,
    },
    stepContainer: {
        flex: 1,
        paddingTop: spacing.xl,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: typography.size['2xl'],
        fontWeight: typography.weight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.size.base,
        color: colors.text.secondary,
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    levelGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    levelCard: {
        width: '47%',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadows.sm,
    },
    levelIconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.accent.light,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    levelLabel: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    levelDescription: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        textAlign: 'center',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    backButtonText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        marginLeft: spacing.sm,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.medium,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    yearSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    yearButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    yearButtonActive: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    yearButtonText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
        fontWeight: typography.weight.medium,
    },
    yearButtonTextActive: {
        color: colors.text.inverse,
    },
    areaSelector: {
        gap: spacing.sm,
    },
    areaButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    areaButtonActive: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    areaButtonText: {
        fontSize: typography.size.base,
        color: colors.text.primary,
    },
    areaButtonTextActive: {
        color: colors.text.inverse,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        marginTop: spacing.xl,
    },
    primaryButtonDisabled: {
        opacity: 0.5,
    },
    primaryButtonText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
        color: colors.text.inverse,
    },
    savingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    savingText: {
        fontSize: typography.size.lg,
        color: colors.text.secondary,
        marginTop: spacing.lg,
    },

    // Estilos de Filtros
    filterToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
        gap: spacing.xs,
    },
    filterToggleText: {
        fontSize: typography.size.sm,
        color: colors.accent.primary,
        fontWeight: typography.weight.medium,
        flex: 1,
    },
    filtersContainer: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    filterGroup: {
        marginBottom: spacing.md,
    },
    filterLabel: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        color: colors.text.tertiary,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
    },
    filterChipsContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingRight: spacing.md,
    },
    filterChip: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    filterChipActive: {
        backgroundColor: colors.accent.primary,
        borderColor: colors.accent.primary,
    },
    filterChipText: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
    },
    filterChipTextActive: {
        color: colors.text.inverse,
    },
});
