import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { View } from "react-native";
import { AppButton, EmptyState, LoadingState, Screen, SectionTitle } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { communityService } from "@/lib/api/services/community.service";
import { CommunityBlog } from "@/lib/api/types";
import { RootStackParamList } from "@/navigation/types";
import { PublicBlogCard } from "./public-community-shared";

type Props = NativeStackScreenProps<RootStackParamList, "PublicLogs">;

async function fetchAllPublicBlogs() {
  const collected: CommunityBlog[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext && page <= 10) {
    const response = await communityService.getBlogs({ page, page_size: 24 });
    collected.push(...(response.results ?? []));
    hasNext = Boolean(response.next);
    page += 1;
  }

  return collected;
}

export function PublicLogsScreen({ navigation }: Props) {
  const blogsQuery = useQuery({
    queryKey: ["community", "public", "blogs", "all"],
    queryFn: fetchAllPublicBlogs,
  });

  const publishedBlogs = useMemo(
    () => (blogsQuery.data ?? []).filter((entry) => entry.is_published !== false),
    [blogsQuery.data]
  );

  return (
    <Screen
      title="Strategic Logs"
      subtitle="All existing strategic logs"
      rightAction={<LanguageToggle />}
    >
      <AppButton label="Back To Community" variant="ghost" onPress={() => navigation.navigate("PublicCommunity")} />

      <SectionTitle title="Official Board Archive" subtitle="Every published leadership log returned by the shared backend." />
      {blogsQuery.isLoading && !blogsQuery.data ? (
        <LoadingState label="Loading strategic logs..." />
      ) : publishedBlogs.length ? (
        <View style={{ gap: 12 }}>
          {publishedBlogs.map((blog) => (
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
        <EmptyState title="No strategic logs yet" description="Published strategic logs will appear here." />
      )}
    </Screen>
  );
}
