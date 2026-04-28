import { Autocomplete } from '@/components/ui/Autocomplete';
import { EducationLevel, saveUserEducation, useEducationData } from '@/hooks/useEducation';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { useAlert } from '@/providers/AlertProvider';
import { useAuthContext } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
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
    View,
    useWindowDimensions
} from 'react-native';
import Animated, { FadeInDown, FadeOutLeft } from 'react-native-reanimated';
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
    const { width } = useWindowDimensions();

    const {
        searchSchools,
        getNearbySchools, // Novo método
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
    const [isLocating, setIsLocating] = useState(false);

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

    // Encontrar escolas perto de mim via GPS
    const handleNearbySearch = async () => {
        if (!selectedLevel) return;

        try {
            setIsLocating(true);
            
            // 1. Pedir permissão
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showAlert({ 
                    title: 'Localização Negada', 
                    message: 'Precisamos de permissão para encontrar escolas perto de ti.' 
                });
                return;
            }

            // 2. Obter posição atual
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            // 3. Definir o ciclo correto
            let cycle: string | undefined;
            if (selectedLevel === 'basic_2') cycle = '2º Ciclo';
            else if (selectedLevel === 'basic_3') cycle = '3º Ciclo';
            else if (selectedLevel === 'secondary') cycle = 'Secundário';

            // 4. Procurar na BD (via RPC)
            const nearby = await getNearbySchools(
                location.coords.latitude, 
                location.coords.longitude, 
                cycle
            );

            if (nearby.length === 0) {
                showAlert({ 
                    title: 'Ups!', 
                    message: 'Não encontrámos escolas num raio de 30km. Tenta pesquisar manualmente.' 
                });
            } else {
                // Forçar a abertura do Autocomplete com os resultados?
                // Aqui podemos apenas avisar ou mostrar uma lista
                showAlert({ 
                    title: 'Escolas Encontradas', 
                    message: `Encontrámos ${nearby.length} escolas perto de ti. Começa a escrever no campo para as veres.` 
                });
            }
        } catch (error) {
            console.error('Erro ao obter localização:', error);
            showAlert({ title: 'Erro', message: 'Ocorreu um erro ao tentar aceder ao GPS.' });
        } finally {
            setIsLocating(false);
        }
    };

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
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F1115', '#161922', '#0A0B0E']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={{ flex: 1 }}>
                {/* Header with Progress */}
                <View style={styles.headerContainer}>
                    <View style={styles.progressTrack}>
                        <LinearGradient
                            colors={COLORS.brand.gradient as [string, string]}
                            style={[styles.progressFill, { width: `${getProgress() * 100}%` }]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                    </View>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Step: Select Level */}
                        {step === 'level' && (
                            <Animated.View
                                entering={FadeInDown.duration(500)}
                                exiting={FadeOutLeft.duration(300)}
                                style={styles.stepContainer}
                            >
                                <View style={styles.iconRing}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="school" size={40} color={COLORS.text.inverse} />
                                    </View>
                                </View>
                                <Text style={styles.title}>Onde estudas?</Text>
                                <Text style={styles.subtitle}>
                                    Seleciona o teu nível de ensino atual para personalizarmos a tua experiência.
                                </Text>

                                <View style={styles.levelGrid}>
                                    {EDUCATION_LEVELS.map((level, index) => (
                                        <Animated.View
                                            key={level.id}
                                            entering={FadeInDown.delay(index * 100).springify()}
                                            style={styles.levelCardWrapper}
                                        >
                                            <Pressable
                                                style={({ pressed }) => [
                                                    styles.levelCard,
                                                    pressed && styles.levelCardPressed
                                                ]}
                                                onPress={() => handleLevelSelect(level.id)}
                                            >
                                                <LinearGradient
                                                    colors={[COLORS.surface, COLORS.surfaceElevated]}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                                <View style={styles.levelCardIcon}>
                                                    <Ionicons name={level.icon as any} size={24} color={COLORS.accent.primary} />
                                                </View>
                                                <Text style={styles.levelLabel}>{level.label}</Text>
                                                <Text style={styles.levelDescription}>{level.description}</Text>

                                                <View style={styles.cardArrow}>
                                                    <Ionicons name="chevron-forward" size={16} color={COLORS.text.tertiary} />
                                                </View>
                                            </Pressable>
                                        </Animated.View>
                                    ))}
                                </View>
                            </Animated.View>
                        )}

                        {/* Step: Details based on level */}
                        {step === 'details' && selectedLevel && (
                            <Animated.View
                                entering={FadeInDown.duration(500)}
                                style={styles.stepContainer}
                            >
                                <View style={styles.navHeader}>
                                    <Pressable style={styles.backButton} onPress={handleBack}>
                                        <Ionicons name="arrow-back" size={20} color={COLORS.text.primary} />
                                    </Pressable>
                                    <Text style={styles.stepTitle}>
                                        {selectedLevel === 'university' ? 'Ensino Superior' : 'Ensino Básico/Secundário'}
                                    </Text>
                                    <View style={{ width: 40 }} />
                                </View>

                                <Text style={styles.sectionTitle}>
                                    Agora os detalhes... 📝
                                </Text>
                                <Text style={styles.sectionSubtitle}>
                                    Precisamos de saber a tua escola e ano para te ligar aos teus colegas.
                                </Text>

                                <View style={styles.formContainer}>
                                    {/* Básico ou Secundário: Escola + Ano */}
                                    {(selectedLevel === 'basic_2' || selectedLevel === 'basic_3' || selectedLevel === 'secondary') && (
                                        <>
                                            {/* Filtros de Localização */}
                                            <Pressable
                                                style={styles.filterToggle}
                                                onPress={() => setShowFilters(!showFilters)}
                                            >
                                                <View style={styles.filterToggleIcon}>
                                                    <Ionicons name="filter" size={14} color={COLORS.accent.primary} />
                                                </View>
                                                <Text style={styles.filterToggleText}>
                                                    {showFilters ? 'Esconder filtros de localização' : 'Filtrar escolas por zona'}
                                                </Text>
                                                <Ionicons
                                                    name={showFilters ? 'chevron-up' : 'chevron-down'}
                                                    size={16}
                                                    color={COLORS.text.tertiary}
                                                />
                                            </Pressable>

                                            {showFilters && (
                                                <Animated.View entering={FadeInDown} style={styles.filtersContainer}>
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
                                                </Animated.View>
                                            )}

                                            <Controller
                                                control={control}
                                                name="school"
                                                rules={{ required: 'Escola é obrigatória' }}
                                                render={({ field: { value, onChange } }) => (
                                                    <View style={styles.inputGroup}>
                                                        <View style={styles.labelWithAction}>
                                                            <Text style={styles.inputLabel}>Escola</Text>
                                                            <Pressable 
                                                                style={[styles.nearbyButton, isLocating && styles.nearbyButtonDisabled]} 
                                                                onPress={handleNearbySearch}
                                                                disabled={isLocating}
                                                            >
                                                                {isLocating ? (
                                                                    <ActivityIndicator size="small" color={COLORS.accent.primary} />
                                                                ) : (
                                                                    <>
                                                                        <Ionicons name="location" size={14} color={COLORS.accent.primary} />
                                                                        <Text style={styles.nearbyButtonText}>Perto de mim</Text>
                                                                    </>
                                                                )}
                                                            </Pressable>
                                                        </View>
                                                        <Autocomplete
                                                            label=""
                                                            placeholder="Pesquisa a tua escola..."
                                                            value={value}
                                                            onSelect={onChange}
                                                            onSearch={handleSearchSchools}
                                                            error={errors.school?.message}
                                                        />
                                                    </View>
                                                )}
                                            />


                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>Ano de Escolaridade</Text>
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
                                            <Text style={styles.inputLabel}>Área de Estudos</Text>
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
                                                        {watch('secondaryArea') === area.id && (
                                                            <Ionicons name="checkmark-circle" size={16} color={COLORS.text.inverse} />
                                                        )}
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
                                                <View style={styles.filterToggleIcon}>
                                                    <Ionicons name="filter" size={14} color={COLORS.accent.primary} />
                                                </View>
                                                <Text style={styles.filterToggleText}>
                                                    {showUniFilters ? 'Esconder filtros' : 'Filtrar universidades por distrito'}
                                                </Text>
                                                <Ionicons
                                                    name={showUniFilters ? 'chevron-up' : 'chevron-down'}
                                                    size={16}
                                                    color={COLORS.text.tertiary}
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
                                                    <View style={styles.inputGroup}>
                                                        <Text style={styles.inputLabel}>Instituição</Text>
                                                        <Autocomplete
                                                            label=""
                                                            placeholder="Pesquisa a tua universidade..."
                                                            value={value}
                                                            onSelect={(item) => {
                                                                onChange(item);
                                                                // Reset curso quando muda universidade
                                                                setValue('degree', null);
                                                            }}
                                                            onSearch={handleSearchUniversities}
                                                            error={errors.university?.message}
                                                        />
                                                    </View>
                                                )}
                                            />

                                            <Controller
                                                control={control}
                                                name="degree"
                                                rules={{ required: 'Curso é obrigatório' }}
                                                render={({ field: { value, onChange } }) => (
                                                    <View style={styles.inputGroup}>
                                                        <Text style={styles.inputLabel}>Curso</Text>
                                                        <Autocomplete
                                                            label=""
                                                            placeholder="Pesquisa o teu curso..."
                                                            value={value}
                                                            onSelect={onChange}
                                                            onSearch={handleSearchDegrees}
                                                            error={errors.degree?.message}
                                                            disabled={!selectedUniversity}
                                                        />
                                                    </View>
                                                )}
                                            />

                                            <View style={styles.inputGroup}>
                                                <Text style={styles.inputLabel}>Ano Curricular</Text>
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
                                </View>

                                {/* Botão Continuar */}
                                <Pressable
                                    style={[styles.primaryButton, (!canContinue() || saving) && styles.primaryButtonDisabled]}
                                    onPress={handleSubmit(onSubmit)}
                                    disabled={!canContinue() || saving}
                                >
                                    <LinearGradient
                                        colors={((!canContinue() || saving) ? [COLORS.surfaceMuted, COLORS.surfaceMuted] : COLORS.brand.gradient) as [string, string]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientButton}
                                    >
                                        {saving ? (
                                            <ActivityIndicator color={COLORS.text.tertiary} />
                                        ) : (
                                            <>
                                                <Text style={[
                                                    styles.primaryButtonText,
                                                    (!canContinue()) && { color: COLORS.text.tertiary }
                                                ]}>Concluir Configuração</Text>
                                                <Ionicons
                                                    name="checkmark-circle"
                                                    size={20}
                                                    color={(!canContinue()) ? COLORS.text.tertiary : COLORS.text.primary}
                                                />
                                            </>
                                        )}
                                    </LinearGradient>
                                </Pressable>
                            </Animated.View>
                        )}

                        {/* Step: Saving */}
                        {step === 'saving' && (
                            <View style={styles.savingContainer}>
                                <ActivityIndicator size="large" color={COLORS.accent.primary} />
                                <Text style={styles.savingText}>A preparar o teu espaço...</Text>
                            </View>
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
    headerContainer: {
        paddingTop: SPACING.md,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    progressTrack: {
        height: 6,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: RADIUS.full,
    },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING['4xl'],
    },
    stepContainer: {
        flex: 1,
        paddingTop: SPACING.lg,
    },

    // Icons & Titles
    iconRing: {
        alignSelf: 'center',
        padding: SPACING.sm,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        marginBottom: SPACING.xl,
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.accent.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.glow,
    },
    title: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontFamily: TYPOGRAPHY.family.bold,
        color: COLORS.text.primary,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.size.base,
        fontFamily: TYPOGRAPHY.family.regular,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginBottom: SPACING['2xl'],
        lineHeight: 24,
    },

    // Navigation Header (Details)
    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepTitle: {
        fontSize: TYPOGRAPHY.size.md,
        fontFamily: TYPOGRAPHY.family.semibold,
        color: COLORS.text.primary,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontFamily: TYPOGRAPHY.family.bold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
    },
    sectionSubtitle: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.secondary,
        marginBottom: SPACING.xl,
    },

    // Level Grid
    levelGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    levelCardWrapper: {
        width: '47%',
    },
    levelCard: {
        width: '100%',
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.surfaceElevated,
        minHeight: 160,
    },
    levelCardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    levelCardIcon: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    labelWithAction: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    nearbyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        gap: 4,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    nearbyButtonDisabled: {
        opacity: 0.6,
    },
    nearbyButtonText: {
        fontSize: 12,
        fontFamily: TYPOGRAPHY.family.semibold,
        color: COLORS.accent.primary,
    },
    levelLabel: {
        fontSize: TYPOGRAPHY.size.md,
        fontFamily: TYPOGRAPHY.family.semibold,
        color: COLORS.text.primary,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    levelDescription: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        textAlign: 'center',
        lineHeight: 16,
    },
    cardArrow: {
        position: 'absolute',
        bottom: SPACING.md,
        right: SPACING.md,
        opacity: 0.5,
    },

    // Form
    formContainer: {
        gap: SPACING.xl,
    },
    inputGroup: {
        gap: SPACING.xs,
    },
    inputLabel: {
        fontSize: TYPOGRAPHY.size.sm,
        fontFamily: TYPOGRAPHY.family.medium,
        color: COLORS.text.secondary,
        marginLeft: SPACING.xs,
    },

    // Year Selector
    yearSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    yearButton: {
        width: 50,
        height: 50,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.surfaceElevated,
        borderWidth: 1,
        borderColor: COLORS.surfaceElevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    yearButtonActive: {
        backgroundColor: COLORS.accent.primary,
        borderColor: COLORS.accent.primary,
        ...SHADOWS.glow,
    },
    yearButtonText: {
        fontSize: TYPOGRAPHY.size.md,
        fontFamily: TYPOGRAPHY.family.semibold,
        color: COLORS.text.primary,
    },
    yearButtonTextActive: {
        color: COLORS.text.inverse,
    },

    // Area Selector
    areaSelector: {
        gap: SPACING.sm,
    },
    areaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.surfaceElevated,
    },
    areaButtonActive: {
        backgroundColor: 'rgba(79, 70, 229, 0.15)',
        borderColor: COLORS.accent.primary,
    },
    areaButtonText: {
        fontSize: TYPOGRAPHY.size.base,
        color: COLORS.text.primary,
        fontFamily: TYPOGRAPHY.family.medium,
    },
    areaButtonTextActive: {
        color: COLORS.accent.light,
        fontFamily: TYPOGRAPHY.family.semibold,
    },

    // Filters
    filterToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
        backgroundColor: 'rgba(79, 70, 229, 0.05)',
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        alignSelf: 'flex-start',
    },
    filterToggleIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterToggleText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: COLORS.accent.primary,
        fontFamily: TYPOGRAPHY.family.medium,
    },
    filtersContainer: {
        backgroundColor: COLORS.surfaceElevated,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        marginTop: -SPACING.md,
        marginBottom: SPACING.md,
    },
    filterGroup: {
        gap: SPACING.xs,
    },
    filterLabel: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.tertiary,
        marginBottom: SPACING.xs,
    },
    filterChipsContainer: {
        gap: SPACING.xs,
        paddingBottom: SPACING.xs,
    },
    filterChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceMuted,
    },
    filterChipActive: {
        backgroundColor: COLORS.accent.primary,
        borderColor: COLORS.accent.primary,
    },
    filterChipText: {
        fontSize: TYPOGRAPHY.size.xs,
        color: COLORS.text.secondary,
    },
    filterChipTextActive: {
        color: COLORS.text.inverse,
        fontWeight: '600',
    },

    // Primary Button
    primaryButton: {
        marginTop: SPACING.xl,
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    primaryButtonDisabled: {
        opacity: 0.7,
        ...SHADOWS.none,
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.lg,
        gap: SPACING.sm,
    },
    primaryButtonText: {
        fontSize: TYPOGRAPHY.size.md,
        fontFamily: TYPOGRAPHY.family.bold,
        color: COLORS.text.primary,
    },

    // Loading State
    savingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
    },
    savingText: {
        fontSize: TYPOGRAPHY.size.lg,
        color: COLORS.text.secondary,
        marginTop: SPACING.lg,
        fontFamily: TYPOGRAPHY.family.medium,
    },
});
