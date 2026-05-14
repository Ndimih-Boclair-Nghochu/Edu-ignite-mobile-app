import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/providers/I18nProvider";
import { palette, theme } from "@/theme";

export function LanguageToggle({ inverse = false }: { inverse?: boolean }) {
  const { language, setLanguage } = useI18n();

  return (
    <View style={[styles.wrapper, inverse ? styles.wrapperInverse : null]}>
      {[
        { label: "EN", value: "en" as const },
        { label: "FR", value: "fr" as const },
      ].map((option) => {
        const active = option.value === language;
        return (
          <Pressable
            key={option.value}
            onPress={() => void setLanguage(option.value)}
            style={[
              styles.option,
              active ? (inverse ? styles.optionActiveInverse : styles.optionActive) : null,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                inverse ? styles.optionTextInverse : null,
                active ? (inverse ? styles.optionTextActiveInverse : styles.optionTextActive) : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: palette.accent,
    borderRadius: theme.radius.pill,
    padding: 4,
    gap: 4,
  },
  wrapperInverse: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  option: {
    minWidth: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  optionActive: {
    backgroundColor: palette.primary,
  },
  optionActiveInverse: {
    backgroundColor: palette.surface,
  },
  optionText: {
    color: palette.primary,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  optionTextInverse: {
    color: palette.surface,
  },
  optionTextActive: {
    color: palette.surface,
  },
  optionTextActiveInverse: {
    color: palette.primary,
  },
});
