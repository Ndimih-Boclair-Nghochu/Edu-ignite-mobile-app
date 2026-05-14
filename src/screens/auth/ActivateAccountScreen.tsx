import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Alert, Image } from "react-native";
import { AppButton, Card, Field, PasswordField, Screen, SuccessInline } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getApiErrorMessage } from "@/lib/api/errors";
import { authService } from "@/lib/api/services/auth.service";
import { platformService } from "@/lib/api/services/platform.service";
import { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/providers/I18nProvider";
import { useAuth } from "@/providers/AuthProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Activate">;

export function ActivateAccountScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { t } = useI18n();
  const [matricule, setMatricule] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const platformSettingsQuery = useQuery({
    queryKey: ["platform", "settings", "activate"],
    queryFn: () => platformService.getPlatformSettings(),
  });

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
      title={t("activateAccount", "Activate Account")}
      subtitle="Set the first password for a newly issued EduIgnite account."
      rightAction={<LanguageToggle />}
    >
      <Card>
        {platformSettingsQuery.data?.logo ? (
          <Image source={{ uri: platformSettingsQuery.data.logo }} style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: "#FFFFFF" }} resizeMode="contain" />
        ) : null}
        <Field
          label="Matricule"
          value={matricule}
          autoCapitalize="characters"
          onChangeText={setMatricule}
          placeholder="Enter the activation matricule"
        />
        <PasswordField
          label="New Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Choose a strong password"
        />
        <PasswordField
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat the new password"
        />
        <AppButton label={t("activateAccount", "Activate Account")} onPress={handleActivate} loading={loading} />
        <AppButton label={t("login", "Login")} variant="ghost" onPress={() => navigation.navigate("Login")} />
        {message ? <SuccessInline label={message} /> : null}
      </Card>
    </Screen>
  );
}
