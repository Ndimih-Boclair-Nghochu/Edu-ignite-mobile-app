import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import {
  AppButton,
  Card,
  EmptyState,
  Field,
  HeroCard,
  LoadingState,
  Screen,
  SectionTitle,
  SuccessInline,
  Tag,
} from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getApiErrorMessage } from "@/lib/api/errors";
import { communityService } from "@/lib/api/services/community.service";
import { ordersService } from "@/lib/api/services/orders.service";
import { platformService } from "@/lib/api/services/platform.service";
import { RootStackParamList } from "@/navigation/types";
import { palette, theme } from "@/theme";
import {
  PublicBlogCard,
  PublicEventCard,
  PublicTestimonyMarquee,
  publicCommunityStyles,
} from "./public-community-shared";

type Props = NativeStackScreenProps<RootStackParamList, "PublicCommunity">;

const emptyOrderForm = {
  full_name: "",
  occupation: "",
  school_name: "",
  whatsapp_number: "",
  email: "",
  region: "",
  division: "",
  subDivision: "",
};

export function PublicCommunityScreen({ navigation }: Props) {
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["platform", "settings", "public-community"],
    queryFn: () => platformService.getPlatformSettings(),
  });

  const blogsQuery = useQuery({
    queryKey: ["community", "public", "blogs"],
    queryFn: () => communityService.getBlogs({ page_size: 24 }),
  });

  const testimoniesQuery = useQuery({
    queryKey: ["community", "public", "testimonies"],
    queryFn: () => communityService.getTestimonies({ page_size: 24 }),
  });

  const eventsQuery = useQuery({
    queryKey: ["community", "public", "events"],
    queryFn: () => platformService.getPublicEvents({ page_size: 24 }),
  });

  const publishedBlogs = useMemo(
    () => (blogsQuery.data?.results ?? []).filter((entry) => entry.is_published !== false),
    [blogsQuery.data?.results]
  );

  const approvedTestimonies = useMemo(
    () =>
      (testimoniesQuery.data?.results ?? []).filter(
        (entry) => String(entry.status).toLowerCase() === "approved"
      ),
    [testimoniesQuery.data?.results]
  );

  const highlightPreview = useMemo(
    () => [...(eventsQuery.data?.results ?? [])].sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    [eventsQuery.data?.results]
  );

  async function handleOrderSubmit() {
    if (
      !orderForm.full_name.trim() ||
      !orderForm.occupation.trim() ||
      !orderForm.school_name.trim() ||
      !orderForm.whatsapp_number.trim() ||
      !orderForm.email.trim() ||
      !orderForm.region.trim()
    ) {
      Alert.alert("Missing details", "Complete the required activation request fields.");
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);

    try {
      await ordersService.createOrder(orderForm);
      setOrderForm(emptyOrderForm);
      setSuccessMessage("Your activation request has been received.");
    } catch (error) {
      Alert.alert("Request failed", getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const platformName = settingsQuery.data?.name || "EduIgnite";
  const platformLogo = settingsQuery.data?.logo;

  return (
    <Screen
      title="Community Portal"
      subtitle={`${platformName} public stories, strategic logs, and highlights.`}
      rightAction={<LanguageToggle />}
    >
      <HeroCard
        eyebrow="National Institutional Network"
        title={`${platformName} Community`}
        description="Public access to official strategic logs, institutional highlights, community proof, and activation requests."
      >
        <View style={styles.heroBrandRow}>
          <View style={styles.heroLogoFrame}>
            {platformLogo ? (
              <Image source={{ uri: platformLogo }} resizeMode="contain" style={styles.heroLogo} />
            ) : (
              <Text style={styles.heroLogoFallback}>{platformName.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Tag label="Official Community" />
            <Text style={styles.heroBrandText}>
              Fueling the digital transformation of education across Africa.
            </Text>
          </View>
        </View>
      </HeroCard>

      <View style={publicCommunityStyles.actionRow}>
        <AppButton label="Portal Login" onPress={() => navigation.navigate("Login")} />
        <AppButton
          label="Activate Account"
          variant="secondary"
          onPress={() => navigation.navigate("Activate")}
        />
      </View>

      <SectionTitle
        title="Strategic Logs"
        subtitle="Published leadership updates and official platform records."
        rightAction={
          <AppButton
            compact
            label="All Logs"
            variant="ghost"
            onPress={() => navigation.navigate("PublicLogs")}
          />
        }
      />
      {blogsQuery.isLoading && !blogsQuery.data ? (
        <LoadingState label="Loading strategic logs..." />
      ) : publishedBlogs.length ? (
        <View style={styles.sectionStack}>
          {publishedBlogs.slice(0, 4).map((blog) => (
            <PublicBlogCard
              key={blog.id}
              blog={blog}
              onOpen={() =>
                navigation.navigate("PublicLogDetail", {
                  blogId: blog.id,
                  title: blog.title || "Strategic Log",
                })
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState
          title="No strategic logs yet"
          description="Published strategic logs will appear here."
        />
      )}

      <SectionTitle
        title="Institutional Highlights"
        subtitle="Published photo and video highlights from the community."
        rightAction={
          <AppButton
            compact
            label="All Highlights"
            variant="ghost"
            onPress={() => navigation.navigate("PublicHighlights")}
          />
        }
      />
      {eventsQuery.isLoading && !eventsQuery.data ? (
        <LoadingState label="Loading highlights..." />
      ) : highlightPreview.length ? (
        <View style={styles.sectionStack}>
          {highlightPreview.slice(0, 4).map((event) => (
            <PublicEventCard key={event.id} event={event} compact />
          ))}
        </View>
      ) : (
        <EmptyState
          title="No highlights yet"
          description="Institutional highlights will appear here."
        />
      )}

      <SectionTitle
        title="Community Proof"
        subtitle="Approved testimonies from the public portal."
      />
      {testimoniesQuery.isLoading && !testimoniesQuery.data ? (
        <LoadingState label="Loading testimonies..." />
      ) : approvedTestimonies.length ? (
        <PublicTestimonyMarquee testimonies={approvedTestimonies.slice(0, 8)} />
      ) : (
        <EmptyState
          title="No testimonies yet"
          description="Approved testimonies will appear here."
        />
      )}

      <SectionTitle
        title="Activate Your Node"
        subtitle="Submit a public activation request for a new institution."
      />
      <Card style={styles.orderCard}>
        <Field
          label="Full Name"
          value={orderForm.full_name}
          onChangeText={(value) => setOrderForm((current) => ({ ...current, full_name: value }))}
          placeholder="e.g. Dr. Jean Dupont"
        />
        <Field
          label="Occupation"
          value={orderForm.occupation}
          onChangeText={(value) => setOrderForm((current) => ({ ...current, occupation: value }))}
          placeholder="e.g. School Principal"
        />
        <Field
          label="School Name"
          value={orderForm.school_name}
          onChangeText={(value) => setOrderForm((current) => ({ ...current, school_name: value }))}
          placeholder="e.g. GBHS DEIDO"
        />
        <Field
          label="WhatsApp Number"
          value={orderForm.whatsapp_number}
          keyboardType="phone-pad"
          onChangeText={(value) =>
            setOrderForm((current) => ({ ...current, whatsapp_number: value }))
          }
          placeholder="+237..."
        />
        <Field
          label="Email"
          value={orderForm.email}
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={(value) => setOrderForm((current) => ({ ...current, email: value }))}
          placeholder="admin@node.edu"
        />
        <Field
          label="Region"
          value={orderForm.region}
          onChangeText={(value) => setOrderForm((current) => ({ ...current, region: value }))}
          placeholder="Region"
        />
        <Field
          label="Division"
          value={orderForm.division}
          onChangeText={(value) => setOrderForm((current) => ({ ...current, division: value }))}
          placeholder="Division"
        />
        <Field
          label="Sub Division"
          value={orderForm.subDivision}
          onChangeText={(value) => setOrderForm((current) => ({ ...current, subDivision: value }))}
          placeholder="Sub-Division"
        />
        <AppButton label="Submit Activation Request" onPress={handleOrderSubmit} loading={submitting} />
        {successMessage ? <SuccessInline label={successMessage} /> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  heroLogoFrame: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  heroLogo: {
    width: 52,
    height: 52,
  },
  heroLogoFallback: {
    color: palette.surface,
    fontWeight: "900",
    fontSize: 20,
  },
  heroBrandText: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 20,
    fontSize: 13,
  },
  sectionStack: {
    gap: 12,
  },
  orderCard: {
    gap: theme.spacing.md,
  },
});
