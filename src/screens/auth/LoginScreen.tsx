import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { HeroCard, Field, PasswordField, Screen, AppButton, Card, SuccessInline } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getApiErrorMessage } from "@/lib/api/errors";
import { platformService } from "@/lib/api/services/platform.service";
import { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/providers/I18nProvider";
import { useAuth } from "@/providers/AuthProvider";
import { palette, theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { t } = useI18n();
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const platformSettingsQuery = useQuery({
    queryKey: ["platform", "settings", "login"],
    queryFn: () => platformService.getPlatformSettings(),
  });

  async function handleLogin() {
    if (!matricule.trim() || !password.trim()) {
      Alert.alert("Missing details", "Enter the account matricule and password.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await signIn(matricule.trim(), password);
      setMessage("You are signed in and ready to continue.");
    } catch (error) {
      Alert.alert("Login failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardFrame}
    >
      <Screen
        title={platformSettingsQuery.data?.name || "EduIgnite Mobile"}
        subtitle="The same institution backend, redesigned for fast and reliable mobile work."
        contentContainerStyle={styles.screenContent}
        rightAction={<LanguageToggle />}
      >
        <View style={styles.stack}>
          <Card style={styles.formCard}>
            {platformSettingsQuery.data?.logo ? (
              <Image source={{ uri: platformSettingsQuery.data.logo }} style={styles.logo} resizeMode="contain" />
            ) : null}
            <Text style={styles.formTitle}>Welcome back</Text>
            <Text style={styles.formSubtitle}>
              Sign in with the matricule and password already issued for this account.
            </Text>
            <Field
              label="Matricule"
              value={matricule}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onChangeText={setMatricule}
              placeholder="Enter account matricule"
            />
            <PasswordField
              label="Password"
              value={password}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              onChangeText={setPassword}
              placeholder="Enter password"
            />
            <AppButton label={t("login", "Login")} onPress={handleLogin} loading={loading} />
            <AppButton
              label={t("activateAccount", "Activate Account")}
              variant="ghost"
              onPress={() => navigation.navigate("Activate")}
            />
            <AppButton label="Back to Landing" variant="ghost" onPress={() => navigation.navigate("Landing")} />
            {message ? <SuccessInline label={message} /> : null}
          </Card>

          <HeroCard
            eyebrow="Mobile Workspace"
            title="Sign in once, keep working anywhere"
            description="Teachers, school admins, bursars, parents, and learners all enter the same live platform from one professional mobile workspace."
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardFrame: {
    flex: 1,
  },
  screenContent: {
    paddingTop: theme.spacing.sm,
  },
  stack: {
    gap: theme.spacing.lg,
  },
  formCard: {
    gap: theme.spacing.md,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  formTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    color: palette.primary,
  },
  formSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.textMuted,
  },
});
