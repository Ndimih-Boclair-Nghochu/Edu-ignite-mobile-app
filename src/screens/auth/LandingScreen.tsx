import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { platformService } from "@/lib/api/services/platform.service";
import { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/providers/I18nProvider";
import { palette, theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Landing">;

function useTypewriter(text: string, startSignal: number, speed: number) {
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    setValue("");
    if (!text) {
      return;
    }

    let index = 0;
    let active = true;
    const timer = setInterval(() => {
      if (!active) {
        return;
      }
      index += 1;
      setValue(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(timer);
      }
    }, speed);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [startSignal, speed, text]);

  return value;
}

export function LandingScreen({ navigation }: Props) {
  const { t } = useI18n();
  const logoScale = React.useRef(new Animated.Value(0.72)).current;
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const firstButton = React.useRef(new Animated.Value(0)).current;
  const secondButton = React.useRef(new Animated.Value(0)).current;
  const [nameStart, setNameStart] = React.useState(0);
  const [titleStart, setTitleStart] = React.useState(0);
  const [supportStart, setSupportStart] = React.useState(0);

  const platformSettingsQuery = useQuery({
    queryKey: ["platform", "settings", "landing"],
    queryFn: () => platformService.getPlatformSettings(),
  });

  const platformName = platformSettingsQuery.data?.name || "EduIgnite";
  const platformLogo = platformSettingsQuery.data?.logo;
  const landingTitle = t("landingTitle");
  const landingSubtitle = t("landingSubtitle");

  const typedName = useTypewriter(platformName, nameStart, 52);
  const typedTitle = useTypewriter(landingTitle, titleStart, 28);
  const typedSubtitle = useTypewriter(landingSubtitle, supportStart, 18);

  React.useEffect(() => {
    firstButton.setValue(0);
    secondButton.setValue(0);
    logoScale.setValue(0.72);
    logoOpacity.setValue(0);

    const nameDelay = platformName.length * 52 + 200;
    const titleDelay = nameDelay + landingTitle.length * 28 + 180;
    const supportDelay = titleDelay + landingSubtitle.length * 18 + 180;

    const timers = [
      setTimeout(() => setNameStart((current) => current + 1), 420),
      setTimeout(() => setTitleStart((current) => current + 1), nameDelay),
      setTimeout(() => setSupportStart((current) => current + 1), titleDelay),
      setTimeout(() => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(firstButton, {
              toValue: 1,
              duration: 260,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(secondButton, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, supportDelay),
    ];

    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [firstButton, landingSubtitle, landingTitle, logoOpacity, logoScale, platformName, secondButton]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundLayer}>
        <LinearGradient
          colors={[palette.background, "#E2F4F8", "#F0F2F5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.glowPrimary} />
        <View style={styles.glowSecondary} />
      </View>

      <View style={styles.header}>
        <LanguageToggle />
      </View>

      <View style={styles.body}>
        <Animated.View
          style={[
            styles.logoShell,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <LinearGradient
            colors={["rgba(103,208,228,0.92)", "rgba(38,77,115,0.96)"]}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoWrap}
          >
            {platformLogo ? (
              <Image source={{ uri: platformLogo }} style={styles.logo} resizeMode="contain" />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>
                  {platformName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{typedName}</Text>
          <Text style={styles.subtitle}>{typedTitle}</Text>
          <Text style={styles.supporting}>{typedSubtitle}</Text>
        </View>

        <View style={styles.actions}>
          <Animated.View
            style={{
              opacity: firstButton,
              transform: [
                {
                  translateY: firstButton.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            }}
          >
            <AppButton label={t("login")} onPress={() => navigation.navigate("Login")} />
          </Animated.View>
          <Animated.View
            style={{
              opacity: secondButton,
              transform: [
                {
                  translateY: secondButton.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            }}
          >
            <AppButton
              label={t("activateAccount")}
              variant="ghost"
              onPress={() => navigation.navigate("Activate")}
            />
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glowPrimary: {
    position: "absolute",
    top: -110,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(103,208,228,0.34)",
  },
  glowSecondary: {
    position: "absolute",
    bottom: -80,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(38,77,115,0.12)",
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    alignItems: "flex-end",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  logoShell: {
    shadowColor: palette.primary,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  logoWrap: {
    width: 148,
    height: 148,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.44)",
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 30,
  },
  logoFallback: {
    width: 112,
    height: 112,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  logoFallbackText: {
    fontSize: 38,
    fontWeight: "900",
    color: palette.surface,
  },
  textBlock: {
    minHeight: 166,
    gap: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: palette.primary,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: palette.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  supporting: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 332,
  },
  actions: {
    width: "100%",
    maxWidth: 320,
    gap: theme.spacing.sm,
  },
});
