import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Alert } from "react-native";
import { AppButton, Card, Field, Screen, SuccessInline } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { authService } from "@/lib/api/services/auth.service";
import { RootStackParamList } from "@/navigation/types";
import { useAuth } from "@/providers/AuthProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Activate">;

export function ActivateAccountScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleActivate() {
    if (!matricule.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing details", "Enter matricule, new password, and confirmation.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "The confirmation password does not match.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await authService.activateAccount({
        matricule: matricule.trim(),
        new_password: password,
        confirm_password: confirmPassword,
      });
      await signIn(matricule.trim(), password);
      setMessage("Account activated and signed in successfully.");
    } catch (error) {
      Alert.alert("Activation failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      title="Activate Account"
      subtitle="Set the first password for a newly issued EduIgnite account."
    >
      <Card>
        <Field
          label="Matricule"
          value={matricule}
          autoCapitalize="characters"
          onChangeText={setMatricule}
          placeholder="Enter the activation matricule"
        />
        <Field
          label="New Password"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          placeholder="Choose a strong password"
        />
        <Field
          label="Confirm Password"
          value={confirmPassword}
          secureTextEntry
          onChangeText={setConfirmPassword}
          placeholder="Repeat the new password"
        />
        <AppButton label="Activate Account" onPress={handleActivate} loading={loading} />
        <AppButton label="Back to Login" variant="ghost" onPress={() => navigation.goBack()} />
        {message ? <SuccessInline label={message} /> : null}
      </Card>
    </Screen>
  );
}
