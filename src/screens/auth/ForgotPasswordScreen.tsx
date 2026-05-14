import { useMutation } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import {
  AppButton,
  Card,
  Field,
  PasswordField,
  Screen,
  SectionTitle,
  SuccessInline,
} from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getApiErrorMessage } from "@/lib/api/errors";
import { authService } from "@/lib/api/services/auth.service";
import { RootStackParamList } from "@/navigation/types";
import { theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

function extractResetToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const tokenMatch = trimmed.match(/[?&]token=([^&]+)/i);
  if (tokenMatch?.[1]) {
    return decodeURIComponent(tokenMatch[1]);
  }

  return trimmed;
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const [matricule, setMatricule] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  const resetToken = useMemo(() => extractResetToken(tokenInput), [tokenInput]);

  const requestMutation = useMutation({
    mutationFn: () => authService.requestPasswordReset(matricule.trim()),
    onSuccess: (payload) => {
      setRequestMessage(payload.detail || "Reset link sent.");
    },
    onError: (error) => {
      Alert.alert("Request failed", getApiErrorMessage(error));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!resetToken) {
        throw new Error("Enter the reset token or link.");
      }
      if (!newPassword || !confirmPassword) {
        throw new Error("Enter and confirm the new password.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("The passwords do not match.");
      }
      return authService.confirmPasswordReset(resetToken, newPassword);
    },
    onSuccess: (payload) => {
      Alert.alert("Password updated", payload.detail || "Your password has been reset.", [
        {
          text: "Go to Login",
          onPress: () => navigation.navigate("Login"),
        },
      ]);
    },
    onError: (error) => {
      Alert.alert("Reset failed", getApiErrorMessage(error));
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <Screen
        title="Forgot Password"
        subtitle="Recover account access"
        contentContainerStyle={{ paddingTop: theme.spacing.sm }}
        rightAction={<LanguageToggle />}
      >
        <Card>
          <SectionTitle title="Request Reset Link" />
          <Field
            label="Matricule"
            value={matricule}
            onChangeText={setMatricule}
            placeholder="Enter account matricule"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <AppButton
            label="Send Reset Link"
            onPress={() => requestMutation.mutate()}
            loading={requestMutation.isPending}
          />
          {requestMessage ? <SuccessInline label={requestMessage} /> : null}
        </Card>

        <Card>
          <SectionTitle title="Set New Password" />
          <Field
            label="Reset Link or Token"
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="Paste the link or token from email"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <PasswordField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
          />
          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
          />
          <AppButton
            label="Reset Password"
            onPress={() => confirmMutation.mutate()}
            loading={confirmMutation.isPending}
          />
        </Card>

        <View style={{ gap: 12 }}>
          <AppButton label="Back to Login" variant="ghost" onPress={() => navigation.navigate("Login")} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
