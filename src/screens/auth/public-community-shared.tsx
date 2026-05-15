import React from "react";
import { Animated, Easing, Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import { AppButton, Card, Tag, UserAvatar } from "@/components/ui";
import { CommunityBlog, PublicEvent, Testimony } from "@/lib/api/types";
import { palette, theme } from "@/theme";

export function isDirectVideoSource(value?: string | null) {
  return !!value && (value.startsWith("data:video/") || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(value));
}

function buildDirectVideoHtml(url: string) {
  return `
    <html>
      <body style="margin:0;background:#0F172A;display:flex;align-items:center;justify-content:center;">
        <video controls playsinline style="width:100%;height:100%;object-fit:cover;background:#0F172A;">
          <source src="${url}" />
        </video>
      </body>
    </html>
  `;
}

function getBlogExcerpt(blog: CommunityBlog) {
  const joinedParagraphs = (blog.paragraphs ?? []).join(" ").trim();
  if (joinedParagraphs) {
    return joinedParagraphs.slice(0, 300);
  }

  const content = (blog as { content?: string }).content?.trim();
  return content ? content.slice(0, 300) : "Open this strategic log to read the full publication.";
}

export function PublicEventCard({
  event,
  compact = false,
}: {
  event: PublicEvent;
  compact?: boolean;
}) {
  const mediaHeight = compact ? 190 : 230;

  return (
    <Card>
      <View style={[styles.mediaFrame, { height: mediaHeight }]}>
        {event.type === "video" && event.url ? (
          isDirectVideoSource(event.url) ? (
            <WebView
              source={{ html: buildDirectVideoHtml(event.url) }}
              style={styles.webview}
              scrollEnabled={false}
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo
            />
          ) : (
            <WebView
              source={{ uri: event.url }}
              style={styles.webview}
              scrollEnabled={false}
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo
            />
          )
        ) : event.url ? (
          <Image source={{ uri: event.url }} resizeMode="cover" style={styles.mediaImage} />
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        <Tag label={event.type === "video" ? "Video" : "Photo"} />
        <Text style={styles.cardTitle}>{event.title}</Text>
        <Text style={styles.cardBody}>{event.description || "Published institutional highlight."}</Text>
      </View>
    </Card>
  );
}

export function PublicBlogCard({
  blog,
  onOpen,
}: {
  blog: CommunityBlog;
  onOpen: () => void;
}) {
  return (
    <Card>
      {blog.image ? (
        <Image source={{ uri: blog.image }} resizeMode="cover" style={styles.blogImage} />
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <UserAvatar
          name={blog.author?.name || blog.senderName || "Community"}
          uri={blog.author?.avatar || blog.senderAvatar}
          size={42}
        />
        <View style={{ flex: 1 }}>
          <Tag label="Official" />
          <Text style={styles.cardTitle}>{blog.title || "Strategic Log"}</Text>
          <Text style={styles.cardMeta}>
            {blog.author?.name || blog.senderName || "Community"}
          </Text>
        </View>
      </View>
      <Text style={styles.cardBody}>
        {getBlogExcerpt(blog)}
      </Text>
      <AppButton label="Open Strategic Log" variant="secondary" onPress={onOpen} />
    </Card>
  );
}

export function PublicTestimonyCard({ testimony }: { testimony: Testimony }) {
  return <BasePublicTestimonyCard testimony={testimony} compact={false} />;
}

function BasePublicTestimonyCard({
  testimony,
  compact,
}: {
  testimony: Testimony;
  compact: boolean;
}) {
  const personName = testimony.name || testimony.author?.name || "Community member";
  const personAvatar = testimony.profileImage || testimony.author?.avatar;
  const personSchool =
    testimony.school_name || testimony.schoolName || "EduIgnite Community";
  const personRole = testimony.role_display || testimony.role || "Community";

  return (
    <Card style={compact ? styles.testimonyCardCompact : styles.testimonyCard}>
      <View style={styles.testimonyTopRow}>
        <View style={styles.testimonyIdentity}>
          <UserAvatar
            name={personName}
            uri={personAvatar}
            size={compact ? 46 : 44}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{personName}</Text>
            <Text style={styles.cardMeta}>{personSchool}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Tag label={personRole} />
        </View>
      </View>
      <Text numberOfLines={compact ? 4 : undefined} style={styles.cardBody}>
        {testimony.message}
      </Text>
    </Card>
  );
}

export function PublicTestimonyMarquee({ testimonies }: { testimonies: Testimony[] }) {
  const { width } = useWindowDimensions();
  const translateX = React.useRef(new Animated.Value(0)).current;
  const gap = 14;
  const cardWidth = Math.min(Math.max(width - 84, 270), 320);
  const trackWidth = testimonies.length * (cardWidth + gap);

  const loopedItems = React.useMemo(
    () => (testimonies.length > 1 ? [...testimonies, ...testimonies] : testimonies),
    [testimonies]
  );

  React.useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);

    if (testimonies.length <= 1) {
      return;
    }

    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -trackWidth,
        duration: Math.max(22000, trackWidth * 32),
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();

    return () => {
      animation.stop();
      translateX.stopAnimation();
    };
  }, [testimonies.length, trackWidth, translateX]);

  return (
    <View style={styles.marqueeViewport}>
      <Animated.View
        style={[
          styles.marqueeRow,
          {
            transform: [{ translateX: testimonies.length > 1 ? translateX : 0 }],
          },
        ]}
      >
        {loopedItems.map((testimony, index) => (
          <View
            key={`${testimony.id}-${index}`}
            style={{ width: cardWidth, marginRight: gap }}
          >
            <BasePublicTestimonyCard testimony={testimony} compact />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export const publicCommunityStyles = StyleSheet.create({
  actionRow: {
    gap: 10,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});

const styles = StyleSheet.create({
  mediaFrame: {
    overflow: "hidden",
    borderRadius: theme.radius.lg,
    backgroundColor: "#0F172A",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  blogImage: {
    width: "100%",
    height: 190,
    borderRadius: theme.radius.lg,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: palette.text,
  },
  cardMeta: {
    color: palette.textMuted,
    fontSize: 13,
  },
  cardBody: {
    color: palette.textMuted,
    lineHeight: 20,
  },
  testimonyCard: {
    gap: theme.spacing.md,
  },
  testimonyCardCompact: {
    gap: theme.spacing.md,
    minHeight: 210,
  },
  testimonyTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  testimonyIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  marqueeViewport: {
    overflow: "hidden",
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  marqueeRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
});
