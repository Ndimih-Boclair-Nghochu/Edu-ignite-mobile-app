import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useDeferredValue, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  AppButton,
  Card,
  EmptyState,
  Field,
  HeroCard,
  LoadingState,
  OptionChips,
  Screen,
  SectionTitle,
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { libraryService } from "@/lib/api/services/library.service";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

const requestTypeOptions = [
  { label: "Loan", value: "loan" },
  { label: "Soft Copy", value: "soft_copy" },
];

export function LibraryScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [requestType, setRequestType] = useState("loan");

  const booksQuery = useQuery({
    queryKey: queryKeys.library.books({ limit: 200 }),
    queryFn: () => libraryService.getBooks({ limit: 200 }),
  });

  const requestsQuery = useQuery({
    queryKey: queryKeys.library.requests({ limit: 100 }),
    queryFn: () => libraryService.getRequests({ limit: 100 }),
    enabled: ["SCHOOL_ADMIN", "SUB_ADMIN", "LIBRARIAN"].includes(user?.role ?? ""),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.library.stats,
    queryFn: () => libraryService.getLibraryStats(),
  });

  const createRequestMutation = useMutation({
    mutationFn: (payload: { book: string; request_type: "loan" | "soft_copy"; note?: string }) =>
      libraryService.createRequest(payload),
    onSuccess: async () => {
      await requestsQuery.refetch();
      Alert.alert("Request created", "The library request has been sent to the backend.");
    },
    onError: (error) => Alert.alert("Request failed", getApiErrorMessage(error)),
  });

  const canRequest = user?.role !== "PARENT";

  const filteredBooks = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    const rows = booksQuery.data?.results ?? [];
    if (!keyword) {
      return rows;
    }
    return rows.filter((book) =>
      `${book.title} ${book.author} ${book.isbn ?? ""}`.toLowerCase().includes(keyword)
    );
  }, [booksQuery.data?.results, deferredSearch]);

  async function handleRequest(bookId: string, title: string) {
    if (!canRequest) {
      Alert.alert("Restricted", "Parent accounts can browse the library but cannot request a loan.");
      return;
    }

    const payload = { book: bookId, request_type: requestType as "loan" | "soft_copy" };
    if (!isOnline) {
      await enqueue("CREATE_LIBRARY_REQUEST", payload, `Request ${requestType} for ${title}`);
      Alert.alert("Request saved", "The library request has been recorded.");
      return;
    }
    createRequestMutation.mutate(payload);
  }

  return (
    <Screen
      title="Library"
      subtitle="Inventory, request flow, and role-safe access to school books."
      rightAction={<Tag label={`${statsQuery.data?.pending_requests ?? 0} pending`} />}
    >
      <HeroCard
        eyebrow="School Library"
        title="Books and Requests"
        description="Students, teachers, and librarians share the same book catalog. Parent accounts stay read-only for loan actions."
      />

      <Field
        label="Search Books"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by title, author, or ISBN"
      />
      {canRequest ? (
        <OptionChips
          label="Request Type"
          options={requestTypeOptions}
          value={requestType}
          onChange={setRequestType}
        />
      ) : null}

      <SectionTitle
        title="Book Catalog"
        subtitle="Current library stock available to this school account."
      />
      {booksQuery.isLoading && !booksQuery.data ? (
        <LoadingState label="Loading books..." />
      ) : filteredBooks.length ? (
        <View style={{ gap: 12 }}>
          {filteredBooks.map((book) => (
            <Card key={book.id}>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {book.title}
              </Text>
              <Text style={{ color: "#667085" }}>
                {book.author} • {book.category_name || "General"}
              </Text>
              <Text style={{ color: "#667085", lineHeight: 20 }}>
                {book.available_copies} / {book.total_copies} copies available
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Tag label={book.location || "Shelf pending"} />
                {book.digital_copy_url ? <Tag label="Digital copy" tone="success" /> : null}
              </View>
              {canRequest ? (
                <AppButton
                  label="Request Book"
                  variant="secondary"
                  onPress={() => void handleRequest(book.id, book.title)}
                  loading={createRequestMutation.isPending}
                />
              ) : (
                <Text style={{ color: "#667085", lineHeight: 20 }}>
                  Parent accounts can review the catalog but cannot request loans from mobile.
                </Text>
              )}
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No books found"
          description="The current cache does not contain any library book matching this search."
        />
      )}

      {["SCHOOL_ADMIN", "SUB_ADMIN", "LIBRARIAN"].includes(user?.role ?? "") ? (
        <>
          <SectionTitle
            title="Request Oversight"
            subtitle="Library requests currently visible to school operations."
          />
          {requestsQuery.isLoading && !requestsQuery.data ? (
            <LoadingState label="Loading library requests..." />
          ) : (requestsQuery.data?.results ?? []).length ? (
            <View style={{ gap: 12 }}>
              {(requestsQuery.data?.results ?? []).map((request) => (
                <Card key={request.id}>
                  <Text style={{ fontWeight: "800", color: "#102032" }}>
                    {request.book_title || "Library request"}
                  </Text>
                  <Text style={{ color: "#667085" }}>
                    {request.requester_name || "User"} • {request.request_type}
                  </Text>
                  <Tag label={request.status} tone={request.status === "approved" ? "success" : request.status === "pending" ? "warning" : "default"} />
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState
              title="No requests yet"
              description="Library requests from students and staff will appear here."
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}
