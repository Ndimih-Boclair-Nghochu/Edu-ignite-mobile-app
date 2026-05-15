import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { Image, Text, View } from "react-native";
import { AppButton, Card, LoadingState, Screen, Tag, UserAvatar } from "@/components/ui";
import { LanguageToggle } from "@/components/LanguageToggle";
import { communityService } from "@/lib/api/services/community.service";
import { RootStackParamList } from "@/navigation/types";
import { palette } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "PublicLogDetail">;

export function PublicLogDetailScreen({ navigation, route }: Props) {
  const blogQuery = useQuery({
    queryKey: ["community", "public", "blog", route.params.blogId],
    queryFn: async () => {
      try {
        return await communityService.viewBlog(route.params.blogId);
      } catch {
        return communityService.getBlog(route.params.blogId);
      }
    },
  });

  const paragraphs = useMemo(() => {
    const rawParagraphs = blogQuery.data?.paragraphs;
    if (Array.isArray(rawParagraphs) && rawParagraphs.length) {
      return rawParagraphs;
    }

    const content = (blogQuery.data as { content?: string } | undefined)?.content;
    if (!content) {
      return [];
    }

    return content
      .split(/\n{2,}/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }, [blogQuery.data]);

  const byline = useMemo(() => {
    const record = blogQuery.data;
    return {
      name: record?.author?.name || record?.senderName || "EduIgnite Board",
      role: record?.author?.role || record?.senderRole || "Executive",
      avatar: record?.author?.avatar || record?.senderAvatar,
    };
  }, [blogQuery.data]);

  return (
    <Screen
      title={route.params.title || "Strategic Log"}
      subtitle="Official board archive"
      rightAction={<LanguageToggle />}
    >
      <AppButton label="Back To Logs" variant="ghost" onPress={() => navigation.navigate("PublicLogs")} />

      {blogQuery.isLoading && !blogQuery.data ? (
        <LoadingState label="Loading strategic log..." />
      ) : blogQuery.data ? (
        <View style={{ gap: 16 }}>
          {blogQuery.data.image ? (
            <Image
              source={{ uri: blogQuery.data.image }}
              resizeMode="cover"
              style={{ width: "100%", height: 230, borderRadius: 24 }}
            />
          ) : null}

          <Card>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Tag label="Official" />
            </View>
            <Text style={{ fontSize: 24, lineHeight: 30, fontWeight: "900", color: palette.primary }}>
              {blogQuery.data.title || "Strategic Log"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <UserAvatar name={byline.name} uri={byline.avatar} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: palette.text }}>{byline.name}</Text>
                <Text style={{ color: palette.textMuted }}>{byline.role}</Text>
              </View>
            </View>
          </Card>

          {paragraphs.map((paragraph, index) => (
            <Card key={`${blogQuery.data?.id}-${index}`}>
              <Text style={{ color: palette.textMuted, lineHeight: 24, fontSize: 16 }}>
                {paragraph}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text>The strategic log could not be loaded.</Text>
        </Card>
      )}
    </Screen>
  );
}
