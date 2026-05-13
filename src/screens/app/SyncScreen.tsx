import React from "react";
import { Text, View } from "react-native";
import { AppButton, Card, EmptyState, HeroCard, Screen, SectionTitle, Tag } from "@/components/ui";
import { formatDateTime } from "@/lib/utils/format";
import { useSync } from "@/providers/SyncProvider";

export function SyncScreen() {
  const { flushQueue, isOnline, isProcessing, lastError, lastSyncAt, queue } = useSync();

  return (
    <Screen
      title="Sync Center"
      subtitle="Review offline work, inspect pending actions, and push them when the connection is back."
      rightAction={<Tag label={isOnline ? "Online" : "Offline"} tone={isOnline ? "success" : "warning"} />}
    >
      <HeroCard
        eyebrow="Offline Queue"
        title={`${queue.length} action${queue.length === 1 ? "" : "s"} waiting`}
        description="Admissions, announcements, fee updates, conversations, and attendance entries can be queued locally, then synced back to the same web backend."
      >
        <View style={{ marginTop: 12, gap: 10 }}>
          <AppButton
            label={isProcessing ? "Syncing..." : "Sync Now"}
            onPress={() => void flushQueue()}
            loading={isProcessing}
            disabled={!isOnline || !queue.length}
          />
        </View>
      </HeroCard>

      <Card>
        <SectionTitle title="Status" subtitle="Health of the local mobile sync engine." />
        <Text style={{ color: "#102032", fontWeight: "700" }}>
          Connectivity: {isOnline ? "Connected to backend" : "Working offline"}
        </Text>
        <Text style={{ color: "#667085", lineHeight: 20 }}>
          Last successful sync: {lastSyncAt ? formatDateTime(lastSyncAt) : "Not yet synced from this device"}
        </Text>
        {lastError ? <Text style={{ color: "#DC2626", lineHeight: 20 }}>{lastError}</Text> : null}
      </Card>

      <SectionTitle
        title="Supported Offline Actions"
        subtitle="These are the mobile flows currently queued for delayed sync."
      />
      <View style={{ gap: 10 }}>
        {[
          "Create student admissions",
          "Create school announcements",
          "Update student school-fee records",
          "Create class fee assignments",
          "Send chat messages in existing conversations",
          "Record attendance batches",
          "Create sub-schools and classes",
        ].map((item) => (
          <Card key={item}>
            <Text style={{ color: "#102032", fontWeight: "700" }}>{item}</Text>
          </Card>
        ))}
      </View>

      <SectionTitle
        title="Queued Items"
        subtitle="Each item below will be replayed in order when syncing succeeds."
      />
      {queue.length ? (
        <View style={{ gap: 12 }}>
          {queue.map((item) => (
            <Card key={item.id}>
              <Text style={{ fontWeight: "800", color: "#102032" }}>{item.description}</Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>{item.type}</Text>
              <Text style={{ color: "#667085", fontSize: 12 }}>{formatDateTime(item.createdAt)}</Text>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="Queue is clear"
          description="This device has no unsynced changes waiting in the mobile queue."
        />
      )}
    </Screen>
  );
}
