import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircleAlert, CircleCheck, WifiOff } from "lucide-react-native";
import { useSync } from "@/providers/SyncProvider";
import { getInitials } from "@/lib/utils/format";
import { palette, theme } from "@/theme";

export type SelectOption = {
  label: string;
  value: string;
};

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  contentContainerStyle,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  rightAction?: React.ReactNode;
}) {
  const { isOnline, queue } = useSync();

  const body = (
    <View style={[styles.screenContent, contentContainerStyle]}>
      <View style={styles.screenHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>{title}</Text>
          {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
        </View>
        {rightAction}
      </View>
      {!isOnline ? (
        <View style={styles.bannerOffline}>
          <WifiOff color={palette.warning} size={18} />
          <Text style={styles.bannerText}>
            Offline mode. {queue.length} change{queue.length === 1 ? "" : "s"} waiting to sync.
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function HeroCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={[palette.primary, palette.primaryStrong]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroDescription}>{description}</Text>
      {children}
    </LinearGradient>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  subtitle,
  rightAction,
}: {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightAction}
    </View>
  );
}

export function StatCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneStyle =
    tone === "success"
      ? styles.statToneSuccess
      : tone === "warning"
        ? styles.statToneWarning
        : styles.statToneDefault;

  return (
    <Card style={styles.statCard}>
      <View style={[styles.statDot, toneStyle]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {helper ? <Text style={styles.statHelper}>{helper}</Text> : null}
    </Card>
  );
}

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  compact = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
}) {
  const styleMap = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    ghost: styles.buttonGhost,
    danger: styles.buttonDanger,
  };

  const textStyleMap = {
    primary: styles.buttonPrimaryText,
    secondary: styles.buttonSecondaryText,
    ghost: styles.buttonGhostText,
    danger: styles.buttonDangerText,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.buttonBase,
        styleMap[variant],
        compact ? styles.buttonCompact : null,
        pressed && !(disabled || loading) ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "ghost" ? palette.primary : palette.surface}
          size="small"
        />
      ) : (
        <Text style={[styles.buttonTextBase, textStyleMap[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  multiline,
  style,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.textMuted}
        multiline={multiline}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        {...props}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function OptionChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SelectOption[];
  value?: string | null;
  onChange: (nextValue: string) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.optionRow}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange(option.value)}
                style={[styles.optionChip, active ? styles.optionChipActive : null]}
              >
                <Text
                  style={[styles.optionChipText, active ? styles.optionChipTextActive : null]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function Tag({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneStyle =
    tone === "success"
      ? styles.tagSuccess
      : tone === "warning"
        ? styles.tagWarning
        : tone === "danger"
          ? styles.tagDanger
          : styles.tagDefault;

  const toneTextStyle =
    tone === "success"
      ? styles.tagSuccessText
      : tone === "warning"
        ? styles.tagWarningText
        : tone === "danger"
          ? styles.tagDangerText
          : styles.tagDefaultText;

  return (
    <View style={[styles.tag, toneStyle]}>
      <Text style={[styles.tagText, toneTextStyle]}>{label}</Text>
    </View>
  );
}

export function UserAvatar({ name }: { name?: string | null }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{getInitials(name)}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card style={styles.emptyCard}>
      <CircleAlert color={palette.primary} size={20} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </Card>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <Card style={styles.loadingCard}>
      <ActivityIndicator color={palette.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </Card>
  );
}

export function SuccessInline({ label }: { label: string }) {
  return (
    <View style={styles.successInline}>
      <CircleCheck color={palette.success} size={18} />
      <Text style={styles.successInlineText}>{label}</Text>
    </View>
  );
}

export function ModalSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <AppButton compact label="Close" variant="ghost" onPress={onClose} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  screenContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screenHeader: {
    paddingTop: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: palette.primary,
  },
  screenSubtitle: {
    marginTop: 6,
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  bannerOffline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: palette.warningSoft,
  },
  bannerText: {
    flex: 1,
    color: palette.warning,
    fontSize: 13,
    fontWeight: "600",
  },
  heroCard: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
    shadowColor: palette.primary,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroEyebrow: {
    color: palette.secondary,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heroTitle: {
    color: palette.surface,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900",
  },
  heroDescription: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    shadowColor: palette.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.text,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: palette.textMuted,
  },
  statCard: {
    minHeight: 132,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  statToneDefault: {
    backgroundColor: palette.secondary,
  },
  statToneSuccess: {
    backgroundColor: palette.success,
  },
  statToneWarning: {
    backgroundColor: palette.warning,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    fontWeight: "800",
    color: palette.textMuted,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    color: palette.primary,
  },
  statHelper: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.textMuted,
  },
  buttonBase: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCompact: {
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
  },
  buttonPrimary: {
    backgroundColor: palette.primary,
  },
  buttonSecondary: {
    backgroundColor: palette.secondary,
  },
  buttonGhost: {
    backgroundColor: palette.accent,
  },
  buttonDanger: {
    backgroundColor: palette.danger,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonTextBase: {
    fontSize: 14,
    fontWeight: "800",
  },
  buttonPrimaryText: {
    color: palette.surface,
  },
  buttonSecondaryText: {
    color: palette.primaryStrong,
  },
  buttonGhostText: {
    color: palette.primary,
  },
  buttonDangerText: {
    color: palette.surface,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    fontWeight: "800",
    color: palette.textMuted,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: theme.spacing.md,
    color: palette.text,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 112,
    paddingTop: theme.spacing.md,
    textAlignVertical: "top",
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 16,
    color: palette.textMuted,
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 2,
  },
  optionChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: palette.accent,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionChipActive: {
    backgroundColor: palette.primary,
  },
  optionChipText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  optionChipTextActive: {
    color: palette.surface,
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagDefault: {
    backgroundColor: palette.accent,
  },
  tagSuccess: {
    backgroundColor: palette.successSoft,
  },
  tagWarning: {
    backgroundColor: palette.warningSoft,
  },
  tagDanger: {
    backgroundColor: palette.dangerSoft,
  },
  tagText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tagDefaultText: {
    color: palette.primary,
  },
  tagSuccessText: {
    color: palette.success,
  },
  tagWarningText: {
    color: palette.warning,
  },
  tagDangerText: {
    color: palette.danger,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary,
  },
  avatarText: {
    color: palette.surface,
    fontWeight: "900",
    fontSize: 16,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.primary,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: palette.textMuted,
  },
  loadingCard: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    color: palette.textMuted,
    fontWeight: "600",
  },
  successInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  successInlineText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.success,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 32, 50, 0.28)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "92%",
    backgroundColor: palette.background,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    color: palette.primary,
  },
});
