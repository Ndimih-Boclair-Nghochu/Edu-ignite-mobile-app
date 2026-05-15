import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import {
  AppButton,
  Card,
  EmptyState,
  Field,
  LoadingState,
  ModalSheet,
  OptionChips,
  PasswordField,
  Screen,
  SectionTitle,
  StatCard,
  Tag,
  UserAvatar,
} from "@/components/ui";
import { isPrimaryFounderRole } from "@/features/roles";
import { getApiErrorMessage } from "@/lib/api/errors";
import { communityService } from "@/lib/api/services/community.service";
import { platformService } from "@/lib/api/services/platform.service";
import { schoolsService } from "@/lib/api/services/schools.service";
import { supportService } from "@/lib/api/services/support.service";
import { usersService } from "@/lib/api/services/users.service";
import {
  FounderAccessLevel,
  FounderProfile,
  PublicEvent,
  School,
  UpdatePlatformSettingsRequest,
  UserRole,
} from "@/lib/api/types";
import { pickImageUpload } from "@/lib/uploads";
import { formatDate, formatMoney, formatRole } from "@/lib/utils/format";
import {
  normalizeTutorialLinksRecord,
  type TutorialLinksRecord,
} from "@/lib/tutorial-links";
import { useAuth } from "@/providers/AuthProvider";
import { palette } from "@/theme";

const FOUNDER_ROLE_OPTIONS: Array<{ label: string; value: UserRole }> = [
  { label: "COO", value: "COO" },
  { label: "Investor", value: "INV" },
  { label: "Designer", value: "DESIGNER" },
  { label: "Super Admin", value: "SUPER_ADMIN" },
];

const ACCESS_OPTIONS: Array<{ label: string; value: FounderAccessLevel }> = [
  { label: "Full Access", value: "FULL" },
  { label: "Read Only", value: "READ_ONLY" },
];

const FEE_ROLE_ORDER: UserRole[] = [
  "CEO",
  "CTO",
  "SUPER_ADMIN",
  "COO",
  "INV",
  "DESIGNER",
  "SCHOOL_ADMIN",
  "SUB_ADMIN",
  "TEACHER",
  "STUDENT",
  "PARENT",
  "BURSAR",
  "LIBRARIAN",
];

const REGION_OPTIONS = [
  "Littoral",
  "Centre",
  "East",
  "North",
  "South",
  "West",
  "Northwest",
  "Southwest",
];

const TUTORIAL_ROLE_OPTIONS: UserRole[] = [
  "STUDENT",
  "TEACHER",
  "PARENT",
  "SCHOOL_ADMIN",
  "SUB_ADMIN",
  "BURSAR",
  "LIBRARIAN",
];

const PORTFOLIO_TYPE_OPTIONS = [
  { label: "Video", value: "video" },
  { label: "Image", value: "image" },
] as const;

type FounderFormState = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  role: UserRole;
  founderTitle: string;
  primarySharePercentage: string;
  accessLevel: FounderAccessLevel;
  hasRenewableShares: boolean;
  shareRenewalPeriodDays: string;
};

type ShareFormState = {
  percentage: string;
  note: string;
  durationDays: string;
};

type SchoolFormState = {
  id: string;
  name: string;
  shortName: string;
  principal: string;
  motto: string;
  description: string;
  location: string;
  region: string;
  division: string;
  subDivision: string;
  cityVillage: string;
  address: string;
  phone: string;
  email: string;
};

type PortfolioFormState = {
  title: string;
  description: string;
  url: string;
  type: "video" | "image";
};

const EMPTY_FOUNDER_FORM: FounderFormState = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  role: "COO",
  founderTitle: "",
  primarySharePercentage: "",
  accessLevel: "FULL",
  hasRenewableShares: false,
  shareRenewalPeriodDays: "365",
};

const EMPTY_SHARE_FORM: ShareFormState = {
  percentage: "",
  note: "",
  durationDays: "365",
};

const EMPTY_SCHOOL_FORM: SchoolFormState = {
  id: "",
  name: "",
  shortName: "",
  principal: "",
  motto: "Discipline - Work - Success",
  description: "Institutional node",
  location: "",
  region: "Littoral",
  division: "",
  subDivision: "",
  cityVillage: "",
  address: "",
  phone: "",
  email: "",
};

const EMPTY_PORTFOLIO_FORM: PortfolioFormState = {
  title: "",
  description: "",
  url: "",
  type: "video",
};

function hydrateFounderForm(founder: FounderProfile): FounderFormState {
  return {
    name: founder.name,
    email: founder.email,
    phone: founder.phone || "",
    whatsapp: founder.whatsapp || "",
    role: founder.role,
    founderTitle: founder.founder_title,
    primarySharePercentage: founder.primary_share_percentage,
    accessLevel: founder.access_level,
    hasRenewableShares: founder.has_renewable_shares,
    shareRenewalPeriodDays: String(founder.share_renewal_period_days || 365),
  };
}

function hydrateSchoolForm(school: School): SchoolFormState {
  return {
    id: school.id || school.short_name || school.shortName || "",
    name: school.name || "",
    shortName: school.short_name || school.shortName || "",
    principal: school.principal || "",
    motto: school.motto || "Discipline - Work - Success",
    description: school.description || "Institutional node",
    location: school.location || "",
    region: school.region || "Littoral",
    division: school.division || "",
    subDivision: school.sub_division || school.subDivision || "",
    cityVillage: school.city_village || school.cityVillage || "",
    address: school.address || "",
    phone: school.phone || "",
    email: school.email || "",
  };
}

export function FoundersScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = isPrimaryFounderRole(user?.role);

  const foundersQuery = useQuery({
    queryKey: ["platform", "founders"],
    queryFn: () => usersService.getFounders(),
  });

  const executivesQuery = useQuery({
    queryKey: ["platform", "executives"],
    queryFn: () => usersService.getExecutives({ page_size: 50 }),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sharesOpen, setSharesOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedFounder, setSelectedFounder] = useState<FounderProfile | null>(null);
  const [founderForm, setFounderForm] = useState<FounderFormState>(EMPTY_FOUNDER_FORM);
  const [shareForm, setShareForm] = useState<ShareFormState>(EMPTY_SHARE_FORM);
  const [deleteMatricule, setDeleteMatricule] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const founders = foundersQuery.data ?? [];
  const executives = executivesQuery.data?.results ?? [];

  const sortedFounders = useMemo(
    () =>
      [...founders].sort((left, right) => {
        if (left.is_primary_founder !== right.is_primary_founder) {
          return left.is_primary_founder ? -1 : 1;
        }
        return Number(right.total_share_percentage) - Number(left.total_share_percentage);
      }),
    [founders]
  );

  const invalidateFounderQueries = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["platform", "founders"] }),
      queryClient.invalidateQueries({ queryKey: ["platform", "executives"] }),
    ]);
  }, [queryClient]);

  const createFounderMutation = useMutation({
    mutationFn: () =>
      usersService.createFounder({
        name: founderForm.name.trim(),
        email: founderForm.email.trim(),
        phone: founderForm.phone.trim(),
        whatsapp: founderForm.whatsapp.trim() || founderForm.phone.trim(),
        role: founderForm.role as Extract<UserRole, "SUPER_ADMIN" | "COO" | "INV" | "DESIGNER">,
        founder_title: founderForm.founderTitle.trim(),
        primary_share_percentage: founderForm.primarySharePercentage.trim(),
        access_level: founderForm.accessLevel,
        has_renewable_shares: founderForm.hasRenewableShares,
        share_renewal_period_days: founderForm.hasRenewableShares
          ? Number(founderForm.shareRenewalPeriodDays || 365)
          : undefined,
      }),
    onSuccess: async (payload) => {
      await invalidateFounderQueries();
      setCreateOpen(false);
      setFounderForm(EMPTY_FOUNDER_FORM);
      Alert.alert(
        "Founder added",
        `${payload.name} is ready. Activation matricule: ${payload.matricule}.`
      );
    },
    onError: (error) => Alert.alert("Founder creation failed", getApiErrorMessage(error)),
  });

  const updateFounderMutation = useMutation({
    mutationFn: () => {
      if (!selectedFounder) {
        throw new Error("No founder selected.");
      }
      return usersService.updateFounder(selectedFounder.id, {
        name: founderForm.name.trim(),
        email: founderForm.email.trim(),
        phone: founderForm.phone.trim(),
        whatsapp: founderForm.whatsapp.trim() || founderForm.phone.trim(),
        role: founderForm.role as Extract<UserRole, "SUPER_ADMIN" | "COO" | "INV" | "DESIGNER">,
        founder_title: founderForm.founderTitle.trim(),
        primary_share_percentage: founderForm.primarySharePercentage.trim(),
        access_level: founderForm.accessLevel,
        has_renewable_shares: founderForm.hasRenewableShares,
        share_renewal_period_days: founderForm.hasRenewableShares
          ? Number(founderForm.shareRenewalPeriodDays || 365)
          : undefined,
      });
    },
    onSuccess: async () => {
      await invalidateFounderQueries();
      setEditOpen(false);
      setSelectedFounder(null);
      Alert.alert("Founder updated", "The founder record has been updated.");
    },
    onError: (error) => Alert.alert("Founder update failed", getApiErrorMessage(error)),
  });

  const addSharesMutation = useMutation({
    mutationFn: () => {
      if (!selectedFounder) {
        throw new Error("No founder selected.");
      }
      return usersService.addFounderShares(selectedFounder.id, {
        percentage: shareForm.percentage.trim(),
        note: shareForm.note.trim(),
        duration_days: Number(shareForm.durationDays || 365),
      });
    },
    onSuccess: async () => {
      await invalidateFounderQueries();
      setSharesOpen(false);
      setShareForm(EMPTY_SHARE_FORM);
      setSelectedFounder(null);
      Alert.alert("Shares added", "The founder share allocation has been recorded.");
    },
    onError: (error) => Alert.alert("Share update failed", getApiErrorMessage(error)),
  });

  const renewSharesMutation = useMutation({
    mutationFn: (founderId: string) => usersService.renewFounderShares(founderId),
    onSuccess: async () => {
      await invalidateFounderQueries();
      Alert.alert("Shares renewed", "The renewable founder period has been renewed.");
    },
    onError: (error) => Alert.alert("Renewal failed", getApiErrorMessage(error)),
  });

  const removeShareAdjustmentMutation = useMutation({
    mutationFn: ({
      founderId,
      adjustmentId,
    }: {
      founderId: string;
      adjustmentId: string;
    }) => usersService.removeShareAdjustment(founderId, adjustmentId),
    onSuccess: async () => {
      await invalidateFounderQueries();
      Alert.alert("Adjustment removed", "The expired share adjustment has been removed.");
    },
    onError: (error) => Alert.alert("Removal failed", getApiErrorMessage(error)),
  });

  const deleteFounderMutation = useMutation({
    mutationFn: () => {
      if (!selectedFounder) {
        throw new Error("No founder selected.");
      }
      return usersService.deleteFounder(selectedFounder.id, {
        matricule: deleteMatricule.trim(),
        password: deletePassword,
      });
    },
    onSuccess: async () => {
      await invalidateFounderQueries();
      setDeleteOpen(false);
      setSelectedFounder(null);
      setDeleteMatricule("");
      setDeletePassword("");
      Alert.alert("Founder removed", "The founder account has been removed.");
    },
    onError: (error) => Alert.alert("Removal failed", getApiErrorMessage(error)),
  });

  return (
    <Screen
      title="Founders"
      subtitle="Founder governance"
      rightAction={
        canManage ? (
          <AppButton compact label="Add Founder" onPress={() => setCreateOpen(true)} />
        ) : undefined
      }
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Founder Accounts" value={sortedFounders.length} helper="Founder board accounts." />
        <StatCard
          label="Primary Founders"
          value={sortedFounders.filter((founder) => founder.is_primary_founder).length}
          helper="CEO and CTO with equal protected rights."
          tone="success"
        />
        <StatCard
          label="Renewable Seats"
          value={sortedFounders.filter((founder) => founder.has_renewable_shares).length}
          helper="Founder roles with renewable time windows."
        />
      </View>

      <SectionTitle title="Founder Board" />
      {foundersQuery.isLoading && !founders.length ? (
        <LoadingState label="Loading founders..." />
      ) : sortedFounders.length ? (
        <View style={{ gap: 12 }}>
          {sortedFounders.map((founder) => (
            <Card key={founder.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <UserAvatar name={founder.name} uri={founder.avatar} size={68} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontWeight: "900", fontSize: 18, color: palette.text }}>
                    {founder.name}
                  </Text>
                  <Text style={{ color: palette.textMuted }}>
                    {founder.founder_title || formatRole(founder.role)}
                  </Text>
                  <Text style={{ color: palette.textMuted }}>{founder.email}</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={founder.role} />
                <Tag
                  label={founder.access_level === "FULL" ? "Full Access" : "Read Only"}
                  tone={founder.access_level === "FULL" ? "success" : "warning"}
                />
                <Tag label={`${founder.total_share_percentage}%`} tone="success" />
                {founder.is_primary_founder ? <Tag label="Primary Founder" /> : null}
              </View>

              <Text style={{ color: palette.textMuted }}>
                Matricule: {founder.matricule}
              </Text>
              {founder.phone ? (
                <Text style={{ color: palette.textMuted }}>Phone: {founder.phone}</Text>
              ) : null}

              {founder.has_renewable_shares ? (
                <Card style={{ backgroundColor: palette.accent, padding: 14 }}>
                  <Text style={{ fontWeight: "800", color: palette.text }}>
                    Renewable cycle: {founder.share_renewal_period_days} days
                  </Text>
                  <Text style={{ color: palette.textMuted }}>
                    {founder.shares_expire_at
                      ? `Expires ${formatDate(founder.shares_expire_at)}`
                      : "No expiry date recorded"}
                  </Text>
                  {founder.days_until_share_expiry != null ? (
                    <Text style={{ color: palette.textMuted }}>
                      {founder.days_until_share_expiry} day(s) remaining
                    </Text>
                  ) : null}
                </Card>
              ) : null}

              {founder.share_adjustments.length ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontWeight: "800", color: palette.text }}>
                    Share Adjustments
                  </Text>
                  {founder.share_adjustments.map((adjustment) => (
                    <Card
                      key={adjustment.id}
                      style={{ backgroundColor: "#F8FAFC", padding: 14 }}
                    >
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Tag
                          label={`${adjustment.percentage}%`}
                          tone={adjustment.is_expired ? "warning" : "success"}
                        />
                        <Tag
                          label={adjustment.is_locked ? "Locked" : "Unlocked"}
                          tone={adjustment.is_locked ? "default" : "warning"}
                        />
                      </View>
                      {adjustment.note ? (
                        <Text style={{ color: palette.textMuted }}>{adjustment.note}</Text>
                      ) : null}
                      {adjustment.expires_at ? (
                        <Text style={{ color: palette.textMuted }}>
                          Expires {formatDate(adjustment.expires_at)}
                        </Text>
                      ) : null}
                      {canManage && !adjustment.is_locked ? (
                        <AppButton
                          label="Remove Adjustment"
                          variant="ghost"
                          onPress={() =>
                            removeShareAdjustmentMutation.mutate({
                              founderId: founder.id,
                              adjustmentId: adjustment.id,
                            })
                          }
                          loading={removeShareAdjustmentMutation.isPending}
                        />
                      ) : null}
                    </Card>
                  ))}
                </View>
              ) : null}

              {canManage ? (
                <View style={{ gap: 10 }}>
                  <AppButton
                    label="Edit Founder"
                    variant="secondary"
                    onPress={() => {
                      setSelectedFounder(founder);
                      setFounderForm(hydrateFounderForm(founder));
                      setEditOpen(true);
                    }}
                  />
                  <AppButton
                    label="Add Shares"
                    variant="ghost"
                    onPress={() => {
                      setSelectedFounder(founder);
                      setShareForm(EMPTY_SHARE_FORM);
                      setSharesOpen(true);
                    }}
                  />
                  {founder.has_renewable_shares ? (
                    <AppButton
                      label="Renew Shares"
                      variant="ghost"
                      onPress={() => renewSharesMutation.mutate(founder.id)}
                      loading={renewSharesMutation.isPending}
                    />
                  ) : null}
                  {founder.can_be_removed ? (
                    <AppButton
                      label="Remove Founder"
                      variant="danger"
                      onPress={() => {
                        setSelectedFounder(founder);
                        setDeleteMatricule("");
                        setDeletePassword("");
                        setDeleteOpen(true);
                      }}
                    />
                  ) : null}
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No founders yet" description="Founder records will appear here." />
      )}

      <SectionTitle title="Executive Registry" />
      {executivesQuery.isLoading && !executives.length ? (
        <LoadingState label="Loading executives..." />
      ) : executives.length ? (
        <View style={{ gap: 12 }}>
          {executives.map((executive) => (
            <Card key={executive.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <UserAvatar name={executive.name} uri={executive.avatar} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: palette.text }}>
                    {executive.name}
                  </Text>
                  <Text style={{ color: palette.textMuted }}>
                    {formatRole(executive.role)} • {executive.email}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No executives found" description="Executive accounts will appear here." />
      )}

      <ModalSheet
        visible={createOpen}
        title="Add Founder"
        onClose={() => {
          setCreateOpen(false);
          setFounderForm(EMPTY_FOUNDER_FORM);
        }}
      >
        <FounderForm
          form={founderForm}
          setForm={setFounderForm}
          submitLabel="Create Founder"
          onSubmit={() => createFounderMutation.mutate()}
          loading={createFounderMutation.isPending}
        />
      </ModalSheet>

      <ModalSheet
        visible={editOpen}
        title="Edit Founder"
        onClose={() => {
          setEditOpen(false);
          setSelectedFounder(null);
          setFounderForm(EMPTY_FOUNDER_FORM);
        }}
      >
        <FounderForm
          form={founderForm}
          setForm={setFounderForm}
          submitLabel="Save Founder"
          onSubmit={() => updateFounderMutation.mutate()}
          loading={updateFounderMutation.isPending}
          disableProtectedFields={selectedFounder?.is_primary_founder}
        />
      </ModalSheet>

      <ModalSheet
        visible={sharesOpen}
        title="Add Shares"
        onClose={() => {
          setSharesOpen(false);
          setSelectedFounder(null);
          setShareForm(EMPTY_SHARE_FORM);
        }}
      >
        <View style={{ gap: 16 }}>
          <Text style={{ fontWeight: "800", color: palette.text }}>
            {selectedFounder?.name || "Founder"}
          </Text>
          <Field
            label="Additional Share (%)"
            value={shareForm.percentage}
            onChangeText={(value) => setShareForm((current) => ({ ...current, percentage: value }))}
            placeholder="2.50"
            keyboardType="numeric"
          />
          <Field
            label="Duration (days)"
            value={shareForm.durationDays}
            onChangeText={(value) => setShareForm((current) => ({ ...current, durationDays: value }))}
            placeholder="365"
            keyboardType="numeric"
          />
          <Field
            label="Note"
            value={shareForm.note}
            onChangeText={(value) => setShareForm((current) => ({ ...current, note: value }))}
            placeholder="Reason for this board allocation"
            multiline
          />
          <AppButton
            label="Save Shares"
            onPress={() => addSharesMutation.mutate()}
            loading={addSharesMutation.isPending}
          />
        </View>
      </ModalSheet>

      <ModalSheet
        visible={deleteOpen}
        title="Remove Founder"
        onClose={() => {
          setDeleteOpen(false);
          setSelectedFounder(null);
        }}
      >
        <View style={{ gap: 16 }}>
          <Text style={{ color: palette.textMuted }}>
            Confirm founder removal with your own matricule and password.
          </Text>
          <Field
            label="Your Matricule"
            value={deleteMatricule}
            onChangeText={setDeleteMatricule}
            placeholder="Matricule"
          />
          <PasswordField
            label="Your Password"
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Password"
          />
          <AppButton
            label="Remove Founder"
            variant="danger"
            onPress={() => deleteFounderMutation.mutate()}
            loading={deleteFounderMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}

function FounderForm({
  form,
  setForm,
  submitLabel,
  onSubmit,
  loading,
  disableProtectedFields = false,
}: {
  form: FounderFormState;
  setForm: React.Dispatch<React.SetStateAction<FounderFormState>>;
  submitLabel: string;
  onSubmit: () => void;
  loading: boolean;
  disableProtectedFields?: boolean;
}) {
  const roleOptions = disableProtectedFields
    ? [{ label: form.role, value: form.role }]
    : FOUNDER_ROLE_OPTIONS;

  return (
    <View style={{ gap: 16 }}>
      <Field
        label="Full Name"
        value={form.name}
        onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
        placeholder="Founder name"
      />
      <Field
        label="Founder Title"
        value={form.founderTitle}
        onChangeText={(value) => setForm((current) => ({ ...current, founderTitle: value }))}
        placeholder="Strategic Growth Founder"
      />
      <Field
        label="Email"
        value={form.email}
        onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
        placeholder="Email address"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        label="Phone"
        value={form.phone}
        onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
        placeholder="Phone number"
        keyboardType="phone-pad"
      />
      <Field
        label="WhatsApp"
        value={form.whatsapp}
        onChangeText={(value) => setForm((current) => ({ ...current, whatsapp: value }))}
        placeholder="WhatsApp number"
        keyboardType="phone-pad"
      />
      <OptionChips
        label="System Role"
        options={roleOptions}
        value={form.role}
        onChange={(value) =>
          !disableProtectedFields &&
          setForm((current) => ({ ...current, role: value as UserRole }))
        }
      />
      <Field
        label="Primary Share (%)"
        value={form.primarySharePercentage}
        onChangeText={(value) =>
          !disableProtectedFields &&
          setForm((current) => ({ ...current, primarySharePercentage: value }))
        }
        placeholder="8.50"
        keyboardType="numeric"
        editable={!disableProtectedFields}
      />
      <OptionChips
        label="Access Level"
        options={ACCESS_OPTIONS}
        value={form.accessLevel}
        onChange={(value) =>
          setForm((current) => ({ ...current, accessLevel: value as FounderAccessLevel }))
        }
      />
      <OptionChips
        label="Renewable Shares"
        options={[
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ]}
        value={form.hasRenewableShares ? "yes" : "no"}
        onChange={(value) =>
          setForm((current) => ({ ...current, hasRenewableShares: value === "yes" }))
        }
      />
      {form.hasRenewableShares ? (
        <Field
          label="Renewal Period (days)"
          value={form.shareRenewalPeriodDays}
          onChangeText={(value) =>
            setForm((current) => ({ ...current, shareRenewalPeriodDays: value }))
          }
          placeholder="365"
          keyboardType="numeric"
        />
      ) : null}
      <AppButton label={submitLabel} onPress={onSubmit} loading={loading} />
    </View>
  );
}

export function SchoolsScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageSchools = ["CEO", "CTO", "SUPER_ADMIN"].includes(user?.role || "");
  const statsQuery = useQuery({
    queryKey: ["platform", "school-stats"],
    queryFn: () => platformService.getPlatformStats(),
  });

  const schoolsQuery = useQuery({
    queryKey: ["platform", "schools", "list"],
    queryFn: () => schoolsService.getSchools({ page_size: 50 }),
  });

  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolForm, setSchoolForm] = useState<SchoolFormState>(EMPTY_SCHOOL_FORM);
  const [deleteMatricule, setDeleteMatricule] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const schools = schoolsQuery.data?.results ?? [];
  const filteredSchools = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return schools;
    }

    return schools.filter((school) => {
      const haystack = `${school.name} ${school.short_name || school.shortName || ""} ${school.location || ""} ${school.principal || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [schools, search]);

  const invalidateSchoolQueries = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["platform", "schools"] }),
      queryClient.invalidateQueries({ queryKey: ["platform", "school-stats"] }),
    ]);
  }, [queryClient]);

  const createSchoolMutation = useMutation({
    mutationFn: () =>
      schoolsService.createSchool({
        name: schoolForm.name.trim(),
        short_name: schoolForm.shortName.trim().toUpperCase(),
        principal: schoolForm.principal.trim(),
        motto: schoolForm.motto.trim(),
        description: schoolForm.description.trim(),
        location: schoolForm.location.trim(),
        region: schoolForm.region.trim(),
        division: schoolForm.division.trim(),
        sub_division: schoolForm.subDivision.trim(),
        city_village: schoolForm.cityVillage.trim(),
        address: schoolForm.address.trim(),
        phone: schoolForm.phone.trim(),
        email: schoolForm.email.trim(),
      }),
    onSuccess: async () => {
      await invalidateSchoolQueries();
      setEditorOpen(false);
      setSchoolForm(EMPTY_SCHOOL_FORM);
      Alert.alert("School created", "The institutional node has been provisioned.");
    },
    onError: (error) => Alert.alert("Provisioning failed", getApiErrorMessage(error)),
  });

  const updateSchoolMutation = useMutation({
    mutationFn: () => {
      if (!editingSchool) {
        throw new Error("No school selected.");
      }

      return schoolsService.updateSchool(editingSchool.id, {
        name: schoolForm.name.trim(),
        short_name: schoolForm.shortName.trim().toUpperCase(),
        principal: schoolForm.principal.trim(),
        motto: schoolForm.motto.trim(),
        description: schoolForm.description.trim(),
        location: schoolForm.location.trim(),
        region: schoolForm.region.trim(),
        division: schoolForm.division.trim(),
        sub_division: schoolForm.subDivision.trim(),
        city_village: schoolForm.cityVillage.trim(),
        address: schoolForm.address.trim(),
        phone: schoolForm.phone.trim(),
        email: schoolForm.email.trim(),
      });
    },
    onSuccess: async () => {
      await invalidateSchoolQueries();
      setEditorOpen(false);
      setEditingSchool(null);
      setSchoolForm(EMPTY_SCHOOL_FORM);
      Alert.alert("School updated", "The school record has been updated.");
    },
    onError: (error) => Alert.alert("Update failed", getApiErrorMessage(error)),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      schoolsService.toggleSchoolStatus(id, { status }),
    onSuccess: async () => {
      await invalidateSchoolQueries();
      Alert.alert("Node updated", "The school status has been changed.");
    },
    onError: (error) => Alert.alert("Status change failed", getApiErrorMessage(error)),
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: () => {
      if (!editingSchool) {
        throw new Error("No school selected.");
      }
      return schoolsService.deleteSchool(editingSchool.id, {
        matricule: deleteMatricule.trim(),
        password: deletePassword,
      });
    },
    onSuccess: async () => {
      await invalidateSchoolQueries();
      setDeleteOpen(false);
      setEditorOpen(false);
      setEditingSchool(null);
      setDeleteMatricule("");
      setDeletePassword("");
      Alert.alert("School removed", "The institutional node has been deleted.");
    },
    onError: (error) => Alert.alert("Delete failed", getApiErrorMessage(error)),
  });

  function openCreateSchool() {
    setEditingSchool(null);
    setSchoolForm(EMPTY_SCHOOL_FORM);
    setEditorOpen(true);
  }

  function openEditSchool(school: School) {
    setEditingSchool(school);
    setSchoolForm(hydrateSchoolForm(school));
    setEditorOpen(true);
  }

  return (
    <Screen
      title="Schools"
      subtitle="Institution registry"
      rightAction={
        canManageSchools ? (
          <AppButton compact label="Add School" onPress={openCreateSchool} />
        ) : undefined
      }
    >
      <View style={{ gap: 12 }}>
        <StatCard label="Total Schools" value={statsQuery.data?.total_schools ?? 0} helper="Registered school nodes." />
        <StatCard label="Active Schools" value={statsQuery.data?.active_schools ?? 0} helper="Nodes currently active." tone="success" />
        <StatCard label="Total Students" value={statsQuery.data?.total_students ?? 0} helper="Learners across the network." />
        <StatCard label="Total Teachers" value={statsQuery.data?.total_teachers ?? 0} helper="Teaching workforce across the network." />
      </View>

      <Field
        label="Search"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by school, code, principal, or location"
      />

      <SectionTitle title="Institution Registry" />
      {schoolsQuery.isLoading && !schoolsQuery.data ? (
        <LoadingState label="Loading schools..." />
      ) : filteredSchools.length ? (
        <View style={{ gap: 12 }}>
          {filteredSchools.map((school) => (
            <Card key={school.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <UserAvatar name={school.name} uri={school.logo} size={54} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: palette.text, fontSize: 16 }}>
                    {school.name}
                  </Text>
                  <Text style={{ color: palette.textMuted }}>
                    {school.short_name || school.shortName || "No short name"} •{" "}
                    {school.location || "Location not set"}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={school.status || "Active"} tone={school.status === "Active" ? "success" : "warning"} />
                {school.region ? <Tag label={school.region} /> : null}
              </View>
              <Text style={{ color: palette.textMuted }}>
                {school.student_count ?? 0} students • {school.teacher_count ?? 0} teachers
              </Text>
              <Text style={{ color: palette.textMuted }}>
                Principal: {school.principal || "Not recorded"}
              </Text>
              {canManageSchools ? (
                <View style={{ gap: 10 }}>
                  <AppButton
                    label="Manage School"
                    variant="secondary"
                    onPress={() => openEditSchool(school)}
                  />
                  <AppButton
                    label={school.status === "Active" ? "Suspend Node" : "Activate Node"}
                    variant="ghost"
                    onPress={() =>
                      toggleStatusMutation.mutate({
                        id: school.id,
                        status: school.status === "Active" ? "Suspended" : "Active",
                      })
                    }
                    loading={toggleStatusMutation.isPending}
                  />
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No schools found" description="Registered schools will appear here." />
      )}

      <ModalSheet
        visible={editorOpen}
        title={editingSchool ? "Manage School" : "Add School"}
        onClose={() => {
          setEditorOpen(false);
          setEditingSchool(null);
          setSchoolForm(EMPTY_SCHOOL_FORM);
        }}
      >
        <View style={{ gap: 16 }}>
          <Field
            label="School Name"
            value={schoolForm.name}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, name: value }))}
            placeholder="Government Bilingual High School"
          />
          <Field
            label="Short Name"
            value={schoolForm.shortName}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, shortName: value }))}
            placeholder="GBHS"
            autoCapitalize="characters"
          />
          <Field
            label="Principal"
            value={schoolForm.principal}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, principal: value }))}
            placeholder="Principal name"
          />
          <Field
            label="Email"
            value={schoolForm.email}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, email: value }))}
            placeholder="admin@school.edu"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="Phone"
            value={schoolForm.phone}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, phone: value }))}
            placeholder="+237..."
            keyboardType="phone-pad"
          />
          <OptionChips
            label="Region"
            options={REGION_OPTIONS.map((region) => ({ label: region, value: region }))}
            value={schoolForm.region}
            onChange={(value) => setSchoolForm((current) => ({ ...current, region: value }))}
          />
          <Field
            label="Division"
            value={schoolForm.division}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, division: value }))}
            placeholder="Division"
          />
          <Field
            label="Sub Division"
            value={schoolForm.subDivision}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, subDivision: value }))}
            placeholder="Sub division"
          />
          <Field
            label="City / Village"
            value={schoolForm.cityVillage}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, cityVillage: value }))}
            placeholder="City or village"
          />
          <Field
            label="Location"
            value={schoolForm.location}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, location: value }))}
            placeholder="Douala, Littoral"
          />
          <Field
            label="Address"
            value={schoolForm.address}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, address: value }))}
            placeholder="Street address"
            multiline
          />
          <Field
            label="Motto"
            value={schoolForm.motto}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, motto: value }))}
            placeholder="Discipline - Work - Success"
          />
          <Field
            label="Description"
            value={schoolForm.description}
            onChangeText={(value) => setSchoolForm((current) => ({ ...current, description: value }))}
            placeholder="Institution description"
            multiline
          />
          <AppButton
            label={editingSchool ? "Save School" : "Create School"}
            onPress={() =>
              editingSchool ? updateSchoolMutation.mutate() : createSchoolMutation.mutate()
            }
            loading={createSchoolMutation.isPending || updateSchoolMutation.isPending}
          />
          {editingSchool && canManageSchools ? (
            <AppButton
              label="Delete School"
              variant="danger"
              onPress={() => setDeleteOpen(true)}
            />
          ) : null}
        </View>
      </ModalSheet>

      <ModalSheet
        visible={deleteOpen}
        title="Delete School"
        onClose={() => setDeleteOpen(false)}
      >
        <View style={{ gap: 16 }}>
          <Text style={{ color: palette.textMuted }}>
            Confirm deletion with your own matricule and password.
          </Text>
          <Field
            label="Your Matricule"
            value={deleteMatricule}
            onChangeText={setDeleteMatricule}
            placeholder="Matricule"
          />
          <PasswordField
            label="Your Password"
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Password"
          />
          <AppButton
            label="Delete School"
            variant="danger"
            onPress={() => deleteSchoolMutation.mutate()}
            loading={deleteSchoolMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}

export function SupportScreen() {
  const statsQuery = useQuery({
    queryKey: ["platform", "support", "stats"],
    queryFn: () => supportService.getSupportStats(),
  });

  const supportQuery = useQuery({
    queryKey: ["platform", "support", "contributions"],
    queryFn: () => supportService.getSupportContributions({ page_size: 40 }),
  });

  return (
    <Screen title="Support Registry" subtitle="Platform backing">
      <View style={{ gap: 12 }}>
        <StatCard label="Support Revenue" value={formatMoney(statsQuery.data?.total_revenue)} helper="Recorded support value." tone="success" />
        <StatCard label="Active Users" value={statsQuery.data?.active_users ?? 0} helper="Live users on the platform." />
        <StatCard label="New Orders" value={statsQuery.data?.new_orders ?? 0} helper="Fresh onboarding requests." />
      </View>

      <SectionTitle title="Contribution Ledger" />
      {supportQuery.isLoading && !supportQuery.data ? (
        <LoadingState label="Loading contributions..." />
      ) : (supportQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(supportQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} tone={entry.status === "Verified" ? "success" : "warning"} />
                {(entry.payment_method || entry.method) ? <Tag label={entry.payment_method || entry.method || "Method"} /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: palette.text, fontSize: 16 }}>
                {entry.user?.name || entry.userName || "Supporter"}
              </Text>
              <Text style={{ color: palette.textMuted }}>
                {formatMoney(entry.amount)} • {entry.schoolName || entry.school || "Platform contribution"}
              </Text>
              <Text style={{ color: palette.textMuted }}>{entry.message}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No contributions yet" description="Support contributions will appear here." />
      )}
    </Screen>
  );
}

export function TestimonialsScreen() {
  const testimoniesQuery = useQuery({
    queryKey: ["platform", "testimonies"],
    queryFn: () => communityService.getTestimonies({ page_size: 40 }),
  });

  const pendingQuery = useQuery({
    queryKey: ["platform", "testimonies", "pending"],
    queryFn: () => communityService.getPendingTestimonies({ page_size: 20 }),
  });

  const approvedCount = useMemo(
    () => (testimoniesQuery.data?.results ?? []).filter((item) => item.status === "approved").length,
    [testimoniesQuery.data?.results]
  );

  return (
    <Screen title="Testimonials" subtitle="Community testimonies">
      <View style={{ gap: 12 }}>
        <StatCard label="Total Testimonies" value={testimoniesQuery.data?.count ?? 0} helper="Stories submitted to the platform." />
        <StatCard label="Approved" value={approvedCount} helper="Visible to the public portal." tone="success" />
        <StatCard label="Pending Review" value={pendingQuery.data?.count ?? 0} helper="Waiting for executive review." tone="warning" />
      </View>

      <SectionTitle title="Latest Testimonies" />
      {testimoniesQuery.isLoading && !testimoniesQuery.data ? (
        <LoadingState label="Loading testimonies..." />
      ) : (testimoniesQuery.data?.results ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(testimoniesQuery.data?.results ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={entry.status} tone={entry.status === "approved" ? "success" : "warning"} />
                {entry.role_display || entry.role ? <Tag label={entry.role_display || entry.role || "Role"} /> : null}
              </View>
              <Text style={{ fontWeight: "800", color: palette.text, fontSize: 16 }}>
                {entry.name || entry.author?.name || "Community member"}
              </Text>
              <Text style={{ color: palette.textMuted }}>{entry.message}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState title="No testimonies yet" description="Submitted testimonies will appear here." />
      )}
    </Screen>
  );
}

export function PlatformSettingsScreen() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["platform", "settings", "editor"],
    queryFn: () => platformService.getPlatformSettings(),
  });

  const statsQuery = useQuery({
    queryKey: ["platform", "settings", "stats"],
    queryFn: () => platformService.getPlatformStats(),
  });

  const eventsQuery = useQuery({
    queryKey: ["platform", "settings", "events"],
    queryFn: () => platformService.getPublicEvents({ page_size: 30 }),
  });

  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [honourRollThreshold, setHonourRollThreshold] = useState("15");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [fees, setFees] = useState<Record<string, string>>({});
  const [tutorialLinks, setTutorialLinks] = useState<TutorialLinksRecord>({});
  const [portfolioEditorOpen, setPortfolioEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PublicEvent | null>(null);
  const [portfolioForm, setPortfolioForm] = useState<PortfolioFormState>(EMPTY_PORTFOLIO_FORM);

  React.useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }
    setName(settingsQuery.data.name || "");
    setDeadline(settingsQuery.data.payment_deadline || settingsQuery.data.paymentDeadline || "");
    setHonourRollThreshold(
      String(
        settingsQuery.data.honour_roll_threshold ??
          settingsQuery.data.honourRollThreshold ??
          15
      )
    );
    setContactEmail(settingsQuery.data.contact_email || "");
    setContactPhone(settingsQuery.data.contact_phone || "");
    setFees(settingsQuery.data.fees ?? {});
    setTutorialLinks(
      normalizeTutorialLinksRecord(
        settingsQuery.data.tutorial_links ?? settingsQuery.data.tutorialLinks ?? {},
        TUTORIAL_ROLE_OPTIONS
      )
    );
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      platformService.updatePlatformSettings({
        name: name.trim(),
        payment_deadline: deadline.trim(),
        honour_roll_threshold: Number(honourRollThreshold || 15),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        fees,
      } as UpdatePlatformSettingsRequest),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "settings"] });
      Alert.alert("Platform settings updated", "The platform settings have been saved.");
    },
    onError: (error) => Alert.alert("Save failed", getApiErrorMessage(error)),
  });

  const saveTutorialsMutation = useMutation({
    mutationFn: () =>
      platformService.updatePlatformSettings({
        tutorial_links: tutorialLinks,
        tutorialLinks,
      } as UpdatePlatformSettingsRequest),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "settings"] });
      Alert.alert("Training links updated", "The role training links have been saved.");
    },
    onError: (error) => Alert.alert("Save failed", getApiErrorMessage(error)),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async () => {
      const file = await pickImageUpload({ aspect: [1, 1], quality: 0.9 });
      if (!file) {
        return null;
      }
      return platformService.uploadLogo(file);
    },
    onSuccess: async (payload) => {
      if (!payload) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["platform", "settings"] });
      Alert.alert("Logo updated", "The platform logo has been updated.");
    },
    onError: (error) => Alert.alert("Upload failed", getApiErrorMessage(error)),
  });

  const uploadEventImageMutation = useMutation({
    mutationFn: async () => {
      const file = await pickImageUpload({ allowsEditing: true, quality: 0.86 });
      if (!file) {
        return null;
      }
      return platformService.uploadEventMedia(file);
    },
    onSuccess: (payload) => {
      if (!payload) {
        return;
      }
      setPortfolioForm((current) => ({
        ...current,
        type: payload.media_type,
        url: payload.media_url,
      }));
      Alert.alert("Media ready", "The portfolio image has been uploaded.");
    },
    onError: (error) => Alert.alert("Upload failed", getApiErrorMessage(error)),
  });

  const saveEventMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: portfolioForm.title.trim(),
        description: portfolioForm.description.trim(),
        url: portfolioForm.url.trim(),
        type: portfolioForm.type,
        is_active: true,
      };

      if (!payload.title || !payload.url) {
        throw new Error("Enter the portfolio title and media link.");
      }

      if (editingEvent?.id) {
        return platformService.updatePublicEvent(editingEvent.id, payload);
      }

      return platformService.createPublicEvent(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "settings", "events"] });
      setPortfolioEditorOpen(false);
      setEditingEvent(null);
      setPortfolioForm(EMPTY_PORTFOLIO_FORM);
      Alert.alert("Portfolio updated", "The public portfolio item has been saved.");
    },
    onError: (error) => Alert.alert("Save failed", getApiErrorMessage(error)),
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => platformService.deletePublicEvent(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform", "settings", "events"] });
      Alert.alert("Portfolio updated", "The portfolio item has been removed.");
    },
    onError: (error) => Alert.alert("Delete failed", getApiErrorMessage(error)),
  });

  function openCreatePortfolioItem() {
    setEditingEvent(null);
    setPortfolioForm(EMPTY_PORTFOLIO_FORM);
    setPortfolioEditorOpen(true);
  }

  function openEditPortfolioItem(event: PublicEvent) {
    setEditingEvent(event);
    setPortfolioForm({
      title: event.title || "",
      description: event.description || "",
      url: event.url || "",
      type: event.type === "image" ? "image" : "video",
    });
    setPortfolioEditorOpen(true);
  }

  return (
    <Screen title="Portfolio & Policy" subtitle="Platform settings">
      <View style={{ gap: 12 }}>
        <StatCard label="Active Schools" value={statsQuery.data?.active_schools ?? 0} helper="School nodes currently active." />
        <StatCard label="Total Users" value={statsQuery.data?.total_users ?? 0} helper="Accounts on the platform." />
        <StatCard label="Revenue" value={formatMoney(statsQuery.data?.total_revenue)} helper="Confirmed platform revenue." tone="success" />
      </View>

      {settingsQuery.isLoading && !settingsQuery.data ? (
        <LoadingState label="Loading platform settings..." />
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              {settingsQuery.data?.logo ? (
                <Image
                  source={{ uri: settingsQuery.data.logo }}
                  resizeMode="contain"
                  style={{ width: 78, height: 78, borderRadius: 24, backgroundColor: "#FFFFFF" }}
                />
              ) : (
                <UserAvatar name={name || "EduIgnite"} size={78} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", fontSize: 20, color: palette.text }}>
                  {name || "EduIgnite"}
                </Text>
                <Text style={{ color: palette.textMuted }}>
                  Platform identity and policy controls.
                </Text>
              </View>
            </View>
            <AppButton
              label="Update Logo"
              variant="secondary"
              onPress={() => uploadLogoMutation.mutate()}
              loading={uploadLogoMutation.isPending}
            />
            <Field label="Platform Name" value={name} onChangeText={setName} placeholder="EduIgnite" />
            <Field
              label="Payment Deadline"
              value={deadline}
              onChangeText={setDeadline}
              placeholder="YYYY-MM-DD"
            />
            <Field
              label="Honour Roll Threshold"
              value={honourRollThreshold}
              onChangeText={setHonourRollThreshold}
              placeholder="15"
              keyboardType="numeric"
            />
            <Field
              label="Contact Email"
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="support@eduignite.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Contact Phone"
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="+237..."
              keyboardType="phone-pad"
            />
          </Card>

          <Card>
            <SectionTitle title="Fee Matrix" />
            <View style={{ gap: 14 }}>
              {FEE_ROLE_ORDER.map((role) => (
                <Field
                  key={role}
                  label={formatRole(role)}
                  value={fees[role] || ""}
                  onChangeText={(value) =>
                    setFees((current) => ({ ...current, [role]: value }))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
              ))}
            </View>
            <AppButton
              label="Save Platform Settings"
              onPress={() => saveMutation.mutate()}
              loading={saveMutation.isPending}
            />
          </Card>

          <Card>
            <SectionTitle title="Training Links" />
            <View style={{ gap: 14 }}>
              {TUTORIAL_ROLE_OPTIONS.map((role) => (
                <Card key={role} style={{ gap: 12 }}>
                  <Text style={{ fontWeight: "800", color: palette.text }}>
                    {formatRole(role)}
                  </Text>
                  <Field
                    label="Web App Tutorial"
                    value={tutorialLinks[role]?.web || ""}
                    onChangeText={(value) =>
                      setTutorialLinks((current) => ({
                        ...current,
                        [role]: {
                          web: value,
                          mobile: current[role]?.mobile ?? "",
                        },
                      }))
                    }
                    placeholder="https://..."
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Field
                    label="Mobile App Tutorial"
                    value={tutorialLinks[role]?.mobile || ""}
                    onChangeText={(value) =>
                      setTutorialLinks((current) => ({
                        ...current,
                        [role]: {
                          web: current[role]?.web ?? "",
                          mobile: value,
                        },
                      }))
                    }
                    placeholder="https://..."
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </Card>
              ))}
            </View>
            <AppButton
              label="Save Training Links"
              variant="secondary"
              onPress={() => saveTutorialsMutation.mutate()}
              loading={saveTutorialsMutation.isPending}
            />
          </Card>

          <SectionTitle
            title="Public Portfolio"
            rightAction={<AppButton compact label="Add Item" onPress={openCreatePortfolioItem} />}
          />
          {eventsQuery.isLoading && !eventsQuery.data ? (
            <LoadingState label="Loading portfolio..." />
          ) : (eventsQuery.data?.results ?? []).length ? (
            <View style={{ gap: 12 }}>
              {(eventsQuery.data?.results ?? []).map((event) => (
                <Card key={event.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {event.type === "image" && event.url ? (
                      <Image
                        source={{ uri: event.url }}
                        resizeMode="cover"
                        style={{ width: 72, height: 72, borderRadius: 18 }}
                      />
                    ) : (
                      <UserAvatar name={event.title} size={72} />
                    )}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontWeight: "800", fontSize: 16, color: palette.text }}>
                        {event.title}
                      </Text>
                      <Text style={{ color: palette.textMuted }}>
                        {event.description || "Public portfolio item"}
                      </Text>
                      <Tag label={event.type} />
                    </View>
                  </View>
                  <AppButton
                    label="Edit Item"
                    variant="secondary"
                    onPress={() => openEditPortfolioItem(event)}
                  />
                  <AppButton
                    label="Remove Item"
                    variant="danger"
                    onPress={() => deleteEventMutation.mutate(event.id)}
                    loading={deleteEventMutation.isPending}
                  />
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No portfolio items yet"
              description="Public portfolio items will appear here."
            />
          )}
        </>
      )}

      <ModalSheet
        visible={portfolioEditorOpen}
        title={editingEvent ? "Edit Portfolio Item" : "Add Portfolio Item"}
        onClose={() => {
          setPortfolioEditorOpen(false);
          setEditingEvent(null);
          setPortfolioForm(EMPTY_PORTFOLIO_FORM);
        }}
      >
        <View style={{ gap: 16 }}>
          <OptionChips
            label="Type"
            options={PORTFOLIO_TYPE_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            value={portfolioForm.type}
            onChange={(value) =>
              setPortfolioForm((current) => ({
                ...current,
                type: value as "video" | "image",
              }))
            }
          />
          <Field
            label="Title"
            value={portfolioForm.title}
            onChangeText={(value) =>
              setPortfolioForm((current) => ({ ...current, title: value }))
            }
            placeholder="Portfolio headline"
          />
          <Field
            label="Description"
            value={portfolioForm.description}
            onChangeText={(value) =>
              setPortfolioForm((current) => ({ ...current, description: value }))
            }
            placeholder="Short summary"
            multiline
          />
          <Field
            label={portfolioForm.type === "video" ? "Video URL" : "Image URL"}
            value={portfolioForm.url}
            onChangeText={(value) =>
              setPortfolioForm((current) => ({ ...current, url: value }))
            }
            placeholder="https://..."
            autoCapitalize="none"
            autoCorrect={false}
          />
          {portfolioForm.type === "image" ? (
            <AppButton
              label="Upload Image"
              variant="ghost"
              onPress={() => uploadEventImageMutation.mutate()}
              loading={uploadEventImageMutation.isPending}
            />
          ) : null}
          <AppButton
            label={editingEvent ? "Save Item" : "Create Item"}
            onPress={() => saveEventMutation.mutate()}
            loading={saveEventMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
