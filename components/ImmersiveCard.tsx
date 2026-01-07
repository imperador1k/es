/**
 * ImmersiveCard Component
 * Premium card with image background, gradient overlay, and floating content
 * Inspired by TripGlide / Apple / Airbnb
 */

import { COLORS, GRADIENTS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/theme.premium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';

// ============================================
// TYPES
// ============================================

interface ImmersiveCardProps {
    image: ImageSourcePropType | string;
    title: string;
    subtitle?: string;
    badge?: string;
    badgeColor?: string;
    rating?: number;
    reviewCount?: number;
    time?: string;
    location?: string;
    onPress?: () => void;
    onEdit?: () => void;
    onSeeMore?: () => void;
    variant?: 'hero' | 'standard' | 'compact';
    style?: object;
}

// ============================================
// COMPONENT
// ============================================

export function ImmersiveCard({
    image,
    title,
    subtitle,
    badge,
    badgeColor = COLORS.accent.primary,
    rating,
    reviewCount,
    time,
    location,
    onPress,
    onEdit,
    onSeeMore,
    variant = 'standard',
    style,
}: ImmersiveCardProps) {
    const cardHeight = variant === 'hero' ? 280 : variant === 'compact' ? 160 : 200;
    const imageSource = typeof image === 'string' ? { uri: image } : image;

    return (
        <Pressable
            style={[
                styles.container,
                { height: cardHeight },
                variant === 'hero' && styles.heroContainer,
                variant === 'compact' && styles.compactContainer,
                style,
            ]}
            onPress={onPress}
        >
            {/* Background Image */}
            <Image
                source={imageSource}
                style={styles.backgroundImage}
                resizeMode="cover"
            />

            {/* Gradient Overlay */}
            <LinearGradient
                colors={GRADIENTS.cardOverlay as [string, string, string]}
                style={styles.gradient}
                locations={[0, 0.5, 1]}
            />

            {/* Top Actions */}
            <View style={styles.topRow}>
                {badge && (
                    <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                )}
                <View style={{ flex: 1 }} />
                {onEdit && (
                    <Pressable style={styles.editButton} onPress={onEdit}>
                        <Ionicons name="camera-outline" size={18} color="#FFF" />
                    </Pressable>
                )}
                <Pressable style={styles.favoriteButton}>
                    <Ionicons name="heart-outline" size={20} color="#FFF" />
                </Pressable>
            </View>

            {/* Bottom Content */}
            <View style={styles.content}>
                {/* Location Tag */}
                {location && (
                    <View style={styles.locationRow}>
                        <View style={styles.locationDot} />
                        <Text style={styles.locationText}>{location}</Text>
                    </View>
                )}

                {/* Title */}
                <Text style={[styles.title, variant === 'compact' && styles.titleCompact]} numberOfLines={2}>
                    {title}
                </Text>

                {/* Meta Row */}
                <View style={styles.metaRow}>
                    {/* Rating */}
                    {rating !== undefined && (
                        <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={14} color="#FFF" />
                            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                            {reviewCount !== undefined && (
                                <Text style={styles.reviewText}>{reviewCount} reviews</Text>
                            )}
                        </View>
                    )}

                    {/* Time */}
                    {time && (
                        <View style={styles.timeContainer}>
                            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.timeText}>{time}</Text>
                        </View>
                    )}

                    {/* Subtitle */}
                    {subtitle && !rating && !time && (
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    )}
                </View>

                {/* CTA Button (Hero only) */}
                {variant === 'hero' && (
                    <View style={styles.ctaRow}>
                        <Pressable style={styles.ctaButton} onPress={onSeeMore}>
                            <Text style={styles.ctaText}>See more</Text>
                        </Pressable>
                        <Pressable style={styles.arrowButton} onPress={onPress}>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.text.inverse} />
                        </Pressable>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        borderRadius: RADIUS['3xl'],
        overflow: 'hidden',
        position: 'relative',
        ...SHADOWS.lg,
    },
    heroContainer: {
        width: '100%',
    },
    compactContainer: {
        width: 180,
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },

    // Top Row
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    badge: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
    },
    badgeText: {
        fontSize: TYPOGRAPHY.size.xs,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
    favoriteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },

    // Content
    content: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: SPACING.lg,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    locationDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: SPACING.sm,
    },
    locationText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: 'rgba(255,255,255,0.8)',
    },
    title: {
        fontSize: TYPOGRAPHY.size['2xl'],
        fontWeight: TYPOGRAPHY.weight.bold,
        color: '#FFF',
        marginBottom: SPACING.sm,
    },
    titleCompact: {
        fontSize: TYPOGRAPHY.size.lg,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    ratingText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
    reviewText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: 'rgba(255,255,255,0.7)',
        marginLeft: SPACING.xs,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    timeText: {
        fontSize: TYPOGRAPHY.size.sm,
        color: 'rgba(255,255,255,0.8)',
    },
    subtitle: {
        fontSize: TYPOGRAPHY.size.sm,
        color: 'rgba(255,255,255,0.7)',
    },

    // CTA
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.lg,
        gap: SPACING.md,
    },
    ctaButton: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    ctaText: {
        fontSize: TYPOGRAPHY.size.sm,
        fontWeight: TYPOGRAPHY.weight.semibold,
        color: '#FFF',
    },
    arrowButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default ImmersiveCard;
