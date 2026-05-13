import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { HeroCard, Field, Screen, AppButton, Card, SuccessInline } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/providers/AuthProvider";
import { palette, theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLogin() {
    if (!matricule.trim() || !password.trim()) {
      Alert.alert("Missing details", "Enter the account matricule and password.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await signIn(matricule.trim(), password);
      setMessage(
        response.mode === "offline"
          ? "Signed in with the last verified local session. Pending work will sync when the device reconnects."
          : "You are connected to the live EduIgnite backend."
      );
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
        title="EduIgnite Mobile"
        subtitle="The same institution backend, redesigned for fast mobile work and offline continuity."
        contentContainerStyle={styles.screenContent}
      >
        <View style={styles.stack}>
          <Card style={styles.formCard}>
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
            <Field
              label="Password"
              value={password}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              onChangeText={setPassword}
              placeholder="Enter password"
            />
            <AppButton label="Login" onPress={handleLogin} loading={loading} />
            <AppButton
              label="Activate New Account"
              variant="ghost"
              onPress={() => navigation.navigate("Activate")}
            />
            {message ? <SuccessInline label={message} /> : null}
          </Card>

          <HeroCard
            eyebrow="Mobile Workspace"
            title="Sign in once, keep working anywhere"
            description="Teachers, school admins, bursars, parents, and learners all enter the same live platform with offline-ready access on the same device."
          />

          <Card>
            <Text style={styles.noteTitle}>Offline sign-in note</Text>
            <Text style={styles.noteText}>
              The first successful sign-in on a device must happen online. After that, the same
              device can reopen the account offline, keep using cached data, and queue field
              updates for later sync.
            </Text>
          </Card>
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
  noteTitle: {
    fontWeight: "800",
    color: palette.primary,
    fontSize: 16,
  },
  noteText: {
    color: palette.textMuted,
    lineHeight: 20,
  },
});
