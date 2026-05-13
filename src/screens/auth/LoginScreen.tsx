import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { HeroCard, Field, Screen, AppButton, Card, SuccessInline } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/providers/AuthProvider";

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
    <Screen
      title="EduIgnite Mobile"
      subtitle="The same institution backend, redesigned for fast mobile work and offline continuity."
      scroll={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, gap: 16 }}
      >
        <HeroCard
          eyebrow="Mobile Workspace"
          title="Sign in once, keep working anywhere"
          description="Teachers, school admins, bursars, parents, and learners all enter the same live platform with offline-ready access on the same device."
        />

        <Card>
          <Field
            label="Matricule"
            value={matricule}
            autoCapitalize="characters"
            onChangeText={setMatricule}
            placeholder="Enter account matricule"
          />
          <Field
            label="Password"
            value={password}
            secureTextEntry
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

        <Card>
          <Text style={{ fontWeight: "800", color: "#264D73", fontSize: 16 }}>
            Offline sign-in note
          </Text>
          <Text style={{ color: "#667085", lineHeight: 20 }}>
            The first successful sign-in on a device must happen online. After that, the same
            device can reopen the account offline, keep using cached data, and queue field updates
            for later sync.
          </Text>
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}
