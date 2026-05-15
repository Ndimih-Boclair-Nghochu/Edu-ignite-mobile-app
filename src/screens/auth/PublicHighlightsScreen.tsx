import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { View } from "react-native";
import { AppButton, EmptyState, LoadingState, Screen, SectionTitle } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { platformService } from "@/lib/api/services/platform.service";
import { PublicEvent } from "@/lib/api/types";
import { RootStackParamList } from "@/navigation/types";
import { PublicEventCard } from "./public-community-shared";

type Props = NativeStackScreenProps<RootStackParamList, "PublicHighlights">;

async function fetchAllPublicEvents() {
  const collected: PublicEvent[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext && page <= 10) {
    const response = await platformService.getPublicEvents({ page, page_size: 24 });
    collected.push(...(response.results ?? []));
    hasNext = Boolean(response.next);
    page += 1;
  }

  return collected;
}

export function PublicHighlightsScreen({ navigation }: Props) {
  const eventsQuery = useQuery({
    queryKey: ["community", "public", "events", "all"],
    queryFn: fetchAllPublicEvents,
  });

  return (
    <Screen
      title="Institutional Highlights"
      subtitle="All published public highlights"
      rightAction={<LanguageToggle />}
    >
      <AppButton label="Back To Community" variant="ghost" onPress={() => navigation.navigate("PublicCommunity")} />

      <SectionTitle title="All Highlights" subtitle="Every published photo and video highlight from the web portal feed." />
      {eventsQuery.isLoading && !eventsQuery.data ? (
        <LoadingState label="Loading highlights..." />
      ) : (eventsQuery.data ?? []).length ? (
        <View style={{ gap: 12 }}>
          {(eventsQuery.data ?? []).map((event) => (
            <PublicEventCard key={event.id} event={event} />
          ))}
        </View>
      ) : (
        <EmptyState title="No highlights yet" description="Published highlights will appear here." />
      )}
    </Screen>
  );
}
