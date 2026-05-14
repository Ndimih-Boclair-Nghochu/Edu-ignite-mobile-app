import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Alert, Text, View } from "react-native";
import {
  AppButton,
  Card,
  Field,
  HeroCard,
  Screen,
  SectionTitle,
  UserAvatar,
} from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { isExecutiveRole } from "@/features/roles";
import { getApiErrorMessage } from "@/lib/api/errors";
import { authService } from "@/lib/api/services/auth.service";
import { platformService } from "@/lib/api/services/platform.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { usersService } from "@/lib/api/services/users.service";
import { PlatformSettings, School } from "@/lib/api/types";
import { pickImageUpload } from "@/lib/uploads";
import { formatRole } from "@/lib/utils/format";
import { useI18n } from "@/providers/I18nProvider";
import { useAuth } from "@/providers/AuthProvider";
import { palette } from "@/theme";

export function ProfileScreen() {
  const queryClient = useQueryClient();
  const { refreshProfile, signOut, user } = useAuth();
  const { t } = useI18n();
  const executive = isExecutiveRole(user?.role);

  const profileQuery = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => usersService.getMe(),
  });

  const scopeQuery = useQuery<School | PlatformSettings>({
    queryKey: executive ? ["platform", "settings", "profile"] : ["schools", "me", "profile"],
    queryFn: () =>
      executive ? platformService.getPlatformSettings() : schoolsService.getMySchool(),
    enabled: Boolean(user),
  });

  const profile = profileQuery.data ?? user ?? null;

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const scopeData = scopeQuery.data;
  const executiveScope = executive ? (scopeData as PlatformSettings | undefined) : undefined;
  const schoolScope = executive ? undefined : (scopeData as School | undefined);

  React.useEffect(() => {
    if (!profile) {
      return;
    }
    setName(profile.name || "");
    setEmail(profile.email || "");
    setPhone(profile.phone || "");
    setWhatsapp(profile.whatsapp || "");
  }, [profile]);

  const refreshEverything = React.useCallback(async () => {
    await Promise.all([
      profileQuery.refetch(),
      scopeQuery.refetch(),
      refreshProfile(),
      queryClient.invalidateQueries({ queryKey: ["messages"] }),
    ]);
  }, [profileQuery, queryClient, refreshProfile, scopeQuery]);

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      usersService.updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
      }),
    onSuccess: async () => {
      await refreshEverything();
      Alert.alert("Profile updated", "Your account details have been saved.");
    },
    onError: (error) => Alert.alert("Profile update failed", getApiErrorMessage(error)),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async () => {
      const file = await pickImageUpload({ aspect: [1, 1], quality: 0.82 });
      if (!file) {
        return null;
      }
      return usersService.uploadAvatar(file);
    },
    onSuccess: async (payload) => {
      if (!payload) {
        return;
      }
      await refreshEverything();
      Alert.alert("Photo updated", "Your profile picture has been saved.");
    },
    onError: (error) => Alert.alert("Upload failed", getApiErrorMessage(error)),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      authService.changePassword({
        old_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password updated", "Your password has been changed.");
    },
    onError: (error) => Alert.alert("Password update failed", getApiErrorMessage(error)),
  });

  const scopeName = executive
    ? executiveScope?.name || "EduIgnite"
    : schoolScope?.name || profile?.school?.name || "School";

  const scopeLogo = executive
    ? executiveScope?.logo
    : schoolScope?.logo || profile?.school?.logo;

  return (
    <Screen
      title={t("profile", "Profile")}
      subtitle={formatRole(profile?.role)}
      rightAction={<LanguageToggle />}
    >
      <HeroCard
        eyebrow={profile?.matricule || formatRole(profile?.role)}
        title={profile?.name || "EduIgnite User"}
        description={profile?.email || ""}
      />

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <UserAvatar name={profile?.name} uri={profile?.avatar} size={92} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontWeight: "900", fontSize: 20, color: palette.text }}>
              {profile?.name || "Account"}
            </Text>
            <Text style={{ color: palette.textMuted }}>{formatRole(profile?.role)}</Text>
            <Text style={{ color: palette.textMuted }}>
              {profile?.phone || profile?.whatsapp || profile?.email || "No contact saved"}
            </Text>
          </View>
          {scopeLogo ? <UserAvatar name={scopeName} uri={scopeLogo} size={54} /> : null}
        </View>
        <AppButton
          label="Update Photo"
          variant="secondary"
          onPress={() => uploadAvatarMutation.mutate()}
          loading={uploadAvatarMutation.isPending}
        />
      </Card>

      <Card>
        <SectionTitle title="Personal Details" />
        <Field label="Full Name" value={name} onChangeText={setName} placeholder="Full name" />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          keyboardType="phone-pad"
        />
        <Field
          label="WhatsApp"
          value={whatsapp}
          onChangeText={setWhatsapp}
          placeholder="WhatsApp number"
          keyboardType="phone-pad"
        />
        <AppButton
          label="Save Details"
          onPress={() => updateProfileMutation.mutate()}
          loading={updateProfileMutation.isPending}
        />
      </Card>

      <Card>
        <SectionTitle title="Password" />
        <Field
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          secureTextEntry
        />
        <Field
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          secureTextEntry
        />
        <Field
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          secureTextEntry
        />
        <AppButton
          label="Change Password"
          onPress={() => changePasswordMutation.mutate()}
          loading={changePasswordMutation.isPending}
        />
      </Card>

      <Card>
        <SectionTitle title={executive ? "Platform Scope" : "School Scope"} />
        <Text style={{ fontWeight: "800", fontSize: 17, color: palette.text }}>{scopeName}</Text>
        {schoolScope ? (
          <Text style={{ color: palette.textMuted }}>
            Principal: {schoolScope.principal || "Not recorded"}
          </Text>
        ) : null}
        {executiveScope ? (
          <Text style={{ color: palette.textMuted }}>
            Payment deadline:{" "}
            {executiveScope.payment_deadline ||
              executiveScope.paymentDeadline ||
              "Not configured"}
          </Text>
        ) : null}
      </Card>

      <Card>
        <SectionTitle title="Session" />
        <AppButton
          label={t("refreshProfile", "Refresh Profile")}
          variant="secondary"
          onPress={() => void refreshEverything()}
        />
        <AppButton
          label={t("logout", "Logout")}
          variant="danger"
          onPress={() => void signOut()}
        />
      </Card>
    </Screen>
  );
}
