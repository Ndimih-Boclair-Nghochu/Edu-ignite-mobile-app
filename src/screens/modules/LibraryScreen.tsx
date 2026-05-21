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
  ModalSheet,
  OptionChips,
  Screen,
  SectionTitle,
  StatCard,
  Tag,
} from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/errors";
import { libraryService } from "@/lib/api/services/library.service";
import {
  Book,
  BookLoan,
  BookRequest,
  CreateBookRequest,
  ReviewBookRequestPayload,
} from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";
import { formatDate, formatRole } from "@/lib/utils/format";
import { useAuth } from "@/providers/AuthProvider";
import { useSync } from "@/providers/SyncProvider";

type ReviewAction = "approve" | "reject" | "fulfill";

const requestTypeOptions = [
  { label: "Loan", value: "loan" },
  { label: "Soft Copy", value: "soft_copy" },
];

const bookStatusOptions = [
  { label: "Active", value: "true" },
  { label: "Archived", value: "false" },
];

const defaultBookForm = {
  title: "",
  author: "",
  isbn: "",
  publisher: "",
  publication_year: "",
  total_copies: "1",
  available_copies: "1",
  location: "",
  digital_copy_url: "",
  description: "",
  is_active: "true",
};

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function statusTone(status?: string): "default" | "success" | "warning" | "danger" {
  const normalized = (status ?? "").toLowerCase();
  if (["approved", "fulfilled", "returned", "active"].includes(normalized)) {
    return "success";
  }
  if (["pending", "overdue", "incomplete"].includes(normalized)) {
    return "warning";
  }
  if (["rejected", "lost", "cancelled"].includes(normalized)) {
    return "danger";
  }
  return "default";
}

function getLoanBookTitle(loan: BookLoan) {
  return typeof loan.book === "object" && loan.book?.title ? loan.book.title : loan.book_title || "Book";
}

function getLoanBorrowerName(loan: BookLoan) {
  return typeof loan.borrower === "object" && loan.borrower?.name
    ? loan.borrower.name
    : loan.borrower_name || loan.requester_name || "Borrower";
}

function getLoanBorrowerRole(loan: BookLoan) {
  return typeof loan.borrower === "object" ? loan.borrower.role : undefined;
}

function getRequestTitle(request: BookRequest) {
  return typeof request.book === "object" && request.book?.title
    ? request.book.title
    : request.book_title || "Library request";
}

function openBookForm(book?: Book) {
  if (!book) {
    return defaultBookForm;
  }

  return {
    title: book.title ?? "",
    author: book.author ?? "",
    isbn: book.isbn ?? "",
    publisher: book.publisher ?? "",
    publication_year: book.publication_year ? String(book.publication_year) : "",
    total_copies: String(book.total_copies ?? 1),
    available_copies: String(book.available_copies ?? book.total_copies ?? 1),
    location: book.location ?? "",
    digital_copy_url: book.digital_copy_url ?? "",
    description: book.description ?? "",
    is_active: book.is_active === false ? "false" : "true",
  };
}

export function LibraryScreen() {
  const { user } = useAuth();
  const { enqueue, isOnline } = useSync();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [requestType, setRequestType] = useState("loan");
  const [bookOpen, setBookOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState(defaultBookForm);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [reviewRequest, setReviewRequest] = useState<BookRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [dueDate, setDueDate] = useState(getDefaultDueDate());

  const canManageLibrary = ["SCHOOL_ADMIN", "SUB_ADMIN", "LIBRARIAN"].includes(user?.role ?? "");
  const canRequest = Boolean(user?.role && user.role !== "PARENT" && !canManageLibrary);

  const booksQuery = useQuery({
    queryKey: queryKeys.library.books({ limit: 200 }),
    queryFn: () => libraryService.getBooks({ limit: 200 }),
    enabled: Boolean(user),
  });

  const requestsQuery = useQuery({
    queryKey: queryKeys.library.requests({ limit: 100 }),
    queryFn: () => libraryService.getRequests({ limit: 100 }),
    enabled: Boolean(user && (canManageLibrary || canRequest)),
  });

  const loansQuery = useQuery({
    queryKey: ["library", "loans", { limit: 100 }],
    queryFn: () => libraryService.getLoans({ limit: 100 }),
    enabled: Boolean(user && canManageLibrary),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.library.stats,
    queryFn: () => libraryService.getLibraryStats(),
    enabled: Boolean(user),
  });

  async function refreshLibrary() {
    await Promise.all([
      booksQuery.refetch(),
      requestsQuery.refetch(),
      loansQuery.refetch(),
      statsQuery.refetch(),
    ]);
  }

  const createRequestMutation = useMutation({
    mutationFn: (payload: { book: string; request_type: "loan" | "soft_copy"; note?: string }) =>
      libraryService.createRequest(payload),
    onSuccess: async () => {
      await refreshLibrary();
      Alert.alert("Request created", "The request has been recorded.");
    },
    onError: (error) => Alert.alert("Request failed", getApiErrorMessage(error)),
  });

  const saveBookMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string | null; payload: CreateBookRequest }) =>
      id ? libraryService.updateBook(id, payload) : libraryService.createBook(payload),
    onSuccess: async () => {
      setBookOpen(false);
      setEditingBookId(null);
      setBookForm(defaultBookForm);
      await refreshLibrary();
      Alert.alert("Book saved", "The library catalog has been updated.");
    },
    onError: (error) => Alert.alert("Book save failed", getApiErrorMessage(error)),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      action,
      payload,
    }: {
      id: string;
      action: ReviewAction;
      payload: ReviewBookRequestPayload;
    }) => {
      if (action === "approve") {
        return libraryService.approveRequest(id, payload);
      }
      if (action === "reject") {
        return libraryService.rejectRequest(id, payload);
      }
      return libraryService.fulfillRequest(id, payload);
    },
    onSuccess: async () => {
      setReviewOpen(false);
      setReviewAction(null);
      setReviewRequest(null);
      setReviewNote("");
      setDueDate(getDefaultDueDate());
      await refreshLibrary();
      Alert.alert("Request updated", "The library request has been updated.");
    },
    onError: (error) => Alert.alert("Request update failed", getApiErrorMessage(error)),
  });

  const returnBookMutation = useMutation({
    mutationFn: (loanId: string) => libraryService.returnBook(loanId),
    onSuccess: async () => {
      await refreshLibrary();
      Alert.alert("Book returned", "The loan has been closed.");
    },
    onError: (error) => Alert.alert("Return failed", getApiErrorMessage(error)),
  });

  const filteredBooks = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    const rows = booksQuery.data?.results ?? [];
    if (!keyword) {
      return rows;
    }
    return rows.filter((book) =>
      `${book.title} ${book.author} ${book.isbn ?? ""} ${book.category_name ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [booksQuery.data?.results, deferredSearch]);

  const activeLoans = useMemo(
    () =>
      (loansQuery.data?.results ?? []).filter(
        (loan) => !["returned", "lost"].includes((loan.status ?? "").toLowerCase())
      ),
    [loansQuery.data?.results]
  );

  function openCreateBook() {
    setEditingBookId(null);
    setBookForm(defaultBookForm);
    setBookOpen(true);
  }

  function openEditBook(book: Book) {
    setEditingBookId(book.id);
    setBookForm(openBookForm(book));
    setBookOpen(true);
  }

  function buildBookPayload(): CreateBookRequest | null {
    const title = bookForm.title.trim();
    const author = bookForm.author.trim();
    const totalCopies = Number(bookForm.total_copies || 0);
    const availableCopies = Number(bookForm.available_copies || totalCopies);

    if (!title || !author) {
      Alert.alert("Missing book details", "Enter the book title and author.");
      return null;
    }
    if (!Number.isInteger(totalCopies) || totalCopies < 1) {
      Alert.alert("Invalid copies", "Total copies must be a whole number greater than zero.");
      return null;
    }
    if (!Number.isInteger(availableCopies) || availableCopies < 0 || availableCopies > totalCopies) {
      Alert.alert("Invalid stock", "Available copies must be between zero and total copies.");
      return null;
    }

    const publicationYear = bookForm.publication_year.trim()
      ? Number(bookForm.publication_year.trim())
      : null;
    if (publicationYear !== null && (!Number.isInteger(publicationYear) || publicationYear < 1000)) {
      Alert.alert("Invalid year", "Enter a valid publication year or leave it empty.");
      return null;
    }

    return {
      title,
      author,
      isbn: bookForm.isbn.trim() || undefined,
      publisher: bookForm.publisher.trim() || undefined,
      publication_year: publicationYear,
      total_copies: totalCopies,
      available_copies: availableCopies,
      location: bookForm.location.trim() || undefined,
      digital_copy_url: bookForm.digital_copy_url.trim() || undefined,
      description: bookForm.description.trim() || undefined,
      is_active: bookForm.is_active === "true",
    };
  }

  async function handleSaveBook() {
    const payload = buildBookPayload();
    if (!payload) {
      return;
    }

    if (!isOnline) {
      if (editingBookId) {
        await enqueue(
          "UPDATE_LIBRARY_BOOK",
          { id: editingBookId, data: payload },
          `Update library book ${payload.title}`
        );
      } else {
        await enqueue("CREATE_LIBRARY_BOOK", payload, `Create library book ${payload.title}`);
      }
      setBookOpen(false);
      setEditingBookId(null);
      setBookForm(defaultBookForm);
      Alert.alert("Book saved", "The catalog update has been recorded.");
      return;
    }

    saveBookMutation.mutate({ id: editingBookId, payload });
  }

  async function handleRequest(book: Book) {
    if (!canRequest) {
      Alert.alert("Restricted", "This account manages the catalog instead of requesting books.");
      return;
    }

    const payload = { book: book.id, request_type: requestType as "loan" | "soft_copy" };
    if (!isOnline) {
      await enqueue("CREATE_LIBRARY_REQUEST", payload, `Request ${requestType} for ${book.title}`);
      Alert.alert("Request saved", "The request has been recorded.");
      return;
    }
    createRequestMutation.mutate(payload);
  }

  function openReviewModal(request: BookRequest, action: ReviewAction) {
    setReviewRequest(request);
    setReviewAction(action);
    setReviewNote(request.review_note ?? "");
    setDueDate(getDefaultDueDate());
    setReviewOpen(true);
  }

  async function handleReviewRequest() {
    if (!reviewRequest || !reviewAction) {
      return;
    }

    const payload: ReviewBookRequestPayload = {};
    if (reviewNote.trim()) {
      payload.review_note = reviewNote.trim();
    }
    if (reviewAction === "fulfill" && reviewRequest.request_type === "loan") {
      if (!dueDate.trim()) {
        Alert.alert("Due date required", "Enter a due date to fulfill a loan request.");
        return;
      }
      payload.due_date = dueDate.trim();
    }

    if (!isOnline) {
      if (reviewAction === "approve") {
        await enqueue(
          "APPROVE_LIBRARY_REQUEST",
          { id: reviewRequest.id, data: payload },
          `Approve request for ${getRequestTitle(reviewRequest)}`
        );
      } else if (reviewAction === "reject") {
        await enqueue(
          "REJECT_LIBRARY_REQUEST",
          { id: reviewRequest.id, data: payload },
          `Reject request for ${getRequestTitle(reviewRequest)}`
        );
      } else {
        await enqueue(
          "FULFILL_LIBRARY_REQUEST",
          { id: reviewRequest.id, data: payload },
          `Fulfill request for ${getRequestTitle(reviewRequest)}`
        );
      }
      setReviewOpen(false);
      setReviewAction(null);
      setReviewRequest(null);
      Alert.alert("Request saved", "The request update has been recorded.");
      return;
    }

    reviewMutation.mutate({ id: reviewRequest.id, action: reviewAction, payload });
  }

  async function handleReturnBook(loan: BookLoan) {
    if (!isOnline) {
      await enqueue("RETURN_LIBRARY_BOOK", { loanId: loan.id }, `Return ${getLoanBookTitle(loan)}`);
      Alert.alert("Return saved", "The return has been recorded.");
      return;
    }
    returnBookMutation.mutate(loan.id);
  }

  const rightAction = canManageLibrary ? (
    <AppButton compact label="Add Book" onPress={openCreateBook} />
  ) : (
    <Tag label={`${statsQuery.data?.pending_requests ?? 0} pending`} />
  );

  return (
    <Screen
      title="Library"
      subtitle="Catalog, circulation, requests, and school library records."
      rightAction={rightAction}
    >
      <HeroCard
        eyebrow="School Library"
        title={canManageLibrary ? "Library Control Desk" : "Book Catalog"}
        description={
          canManageLibrary
            ? "Manage books, requests, loans, and returns from the shared backend."
            : "Browse school books and request available copies."
        }
      />

      {canManageLibrary ? (
        <View style={{ gap: 12 }}>
          <StatCard
            label="Books"
            value={statsQuery.data?.total_books ?? booksQuery.data?.count ?? 0}
            helper="Titles currently registered."
          />
          <StatCard
            label="Pending Requests"
            value={statsQuery.data?.pending_requests ?? 0}
            helper="Requests waiting for action."
            tone="warning"
          />
          <StatCard
            label="Active Loans"
            value={statsQuery.data?.active_loans ?? activeLoans.length}
            helper="Books currently in circulation."
            tone="success"
          />
          <StatCard
            label="Overdue"
            value={statsQuery.data?.overdue_loans ?? 0}
            helper="Loans past their due date."
            tone="warning"
          />
        </View>
      ) : null}

      <Field
        label="Search Books"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by title, author, ISBN, or category"
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
          {filteredBooks.map((book) => {
            const requestDisabled =
              (requestType === "loan" && Number(book.available_copies ?? 0) < 1) ||
              (requestType === "soft_copy" && !book.digital_copy_url);

            return (
              <Card key={book.id}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Tag label={book.is_active === false ? "Archived" : "Active"} tone={book.is_active === false ? "warning" : "success"} />
                  <Tag label={book.category_name || "General"} />
                  {book.digital_copy_url ? <Tag label="Digital" tone="success" /> : null}
                </View>
                <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                  {book.title}
                </Text>
                <Text style={{ color: "#667085" }}>{book.author}</Text>
                <Text style={{ color: "#667085", lineHeight: 20 }}>
                  {book.available_copies} / {book.total_copies} copies - {book.location || "Shelf pending"}
                </Text>
                {canManageLibrary ? (
                  <AppButton compact label="Edit Book" variant="ghost" onPress={() => openEditBook(book)} />
                ) : null}
                {canRequest ? (
                  <AppButton
                    label="Request Book"
                    variant="secondary"
                    onPress={() => void handleRequest(book)}
                    disabled={requestDisabled}
                    loading={createRequestMutation.isPending}
                  />
                ) : null}
              </Card>
            );
          })}
        </View>
      ) : (
        <EmptyState
          title="No books found"
          description="No library book matches the current search."
        />
      )}

      {canManageLibrary || canRequest ? (
        <>
          <SectionTitle
            title={canManageLibrary ? "Request Oversight" : "My Requests"}
            subtitle={canManageLibrary ? "Library requests waiting for review or fulfillment." : "Your library request history."}
          />
          {requestsQuery.isLoading && !requestsQuery.data ? (
            <LoadingState label="Loading library requests..." />
          ) : (requestsQuery.data?.results ?? []).length ? (
            <View style={{ gap: 12 }}>
              {(requestsQuery.data?.results ?? []).map((request) => {
                const canAct = canManageLibrary && ["pending", "approved"].includes(request.status);
                return (
                  <Card key={request.id}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <Tag label={request.status} tone={statusTone(request.status)} />
                      <Tag label={request.request_type === "soft_copy" ? "Soft copy" : "Loan"} />
                      {request.requester_role ? <Tag label={formatRole(request.requester_role)} /> : null}
                    </View>
                    <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                      {getRequestTitle(request)}
                    </Text>
                    <Text style={{ color: "#667085" }}>
                      {request.requester_name || "User"} - {formatDate(request.created_at)}
                    </Text>
                    {request.note ? (
                      <Text style={{ color: "#667085", lineHeight: 20 }}>{request.note}</Text>
                    ) : null}
                    {request.review_note ? (
                      <Text style={{ color: "#667085", lineHeight: 20 }}>
                        Review: {request.review_note}
                      </Text>
                    ) : null}
                    {canAct ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {request.status === "pending" ? (
                          <AppButton
                            compact
                            label="Approve"
                            variant="secondary"
                            onPress={() => openReviewModal(request, "approve")}
                          />
                        ) : null}
                        <AppButton
                          compact
                          label="Fulfill"
                          onPress={() => openReviewModal(request, "fulfill")}
                        />
                        <AppButton
                          compact
                          label="Reject"
                          variant="danger"
                          onPress={() => openReviewModal(request, "reject")}
                        />
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          ) : (
            <EmptyState
              title="No requests yet"
              description="Library requests will appear here once created."
            />
          )}
        </>
      ) : null}

      {canManageLibrary ? (
        <>
          <SectionTitle title="Active Loans" subtitle="Books currently assigned to borrowers." />
          {loansQuery.isLoading && !loansQuery.data ? (
            <LoadingState label="Loading loans..." />
          ) : activeLoans.length ? (
            <View style={{ gap: 12 }}>
              {activeLoans.map((loan) => (
                <Card key={loan.id}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Tag label={loan.status} tone={statusTone(loan.status)} />
                    <Tag label={formatRole(getLoanBorrowerRole(loan))} />
                  </View>
                  <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                    {getLoanBookTitle(loan)}
                  </Text>
                  <Text style={{ color: "#667085" }}>
                    {getLoanBorrowerName(loan)} - due {formatDate(loan.due_date)}
                  </Text>
                  {loan.days_overdue ? (
                    <Text style={{ color: "#B54708", lineHeight: 20 }}>
                      {loan.days_overdue} days overdue
                    </Text>
                  ) : null}
                  <AppButton
                    compact
                    label="Mark Returned"
                    variant="secondary"
                    onPress={() => void handleReturnBook(loan)}
                    loading={returnBookMutation.isPending}
                  />
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState title="No active loans" description="Open loans will appear here." />
          )}
        </>
      ) : null}

      <ModalSheet visible={bookOpen} title={editingBookId ? "Edit Book" : "Add Book"} onClose={() => setBookOpen(false)}>
        <View style={{ gap: 16 }}>
          <Field
            label="Title"
            value={bookForm.title}
            onChangeText={(value) => setBookForm((current) => ({ ...current, title: value }))}
            placeholder="Book title"
          />
          <Field
            label="Author"
            value={bookForm.author}
            onChangeText={(value) => setBookForm((current) => ({ ...current, author: value }))}
            placeholder="Author name"
          />
          <Field
            label="ISBN"
            value={bookForm.isbn}
            onChangeText={(value) => setBookForm((current) => ({ ...current, isbn: value }))}
            placeholder="Optional ISBN"
          />
          <Field
            label="Publisher"
            value={bookForm.publisher}
            onChangeText={(value) => setBookForm((current) => ({ ...current, publisher: value }))}
            placeholder="Publisher"
          />
          <Field
            label="Publication Year"
            value={bookForm.publication_year}
            keyboardType="numeric"
            onChangeText={(value) =>
              setBookForm((current) => ({ ...current, publication_year: value }))
            }
            placeholder="e.g. 2026"
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Field
              label="Total"
              value={bookForm.total_copies}
              keyboardType="numeric"
              onChangeText={(value) => setBookForm((current) => ({ ...current, total_copies: value }))}
              placeholder="1"
              style={{ flex: 1 }}
            />
            <Field
              label="Available"
              value={bookForm.available_copies}
              keyboardType="numeric"
              onChangeText={(value) =>
                setBookForm((current) => ({ ...current, available_copies: value }))
              }
              placeholder="1"
              style={{ flex: 1 }}
            />
          </View>
          <Field
            label="Location"
            value={bookForm.location}
            onChangeText={(value) => setBookForm((current) => ({ ...current, location: value }))}
            placeholder="Shelf or room"
          />
          <Field
            label="Digital Copy URL"
            value={bookForm.digital_copy_url}
            autoCapitalize="none"
            onChangeText={(value) =>
              setBookForm((current) => ({ ...current, digital_copy_url: value }))
            }
            placeholder="https://..."
          />
          <Field
            label="Description"
            value={bookForm.description}
            onChangeText={(value) =>
              setBookForm((current) => ({ ...current, description: value }))
            }
            placeholder="Short description"
            multiline
          />
          <OptionChips
            label="Status"
            options={bookStatusOptions}
            value={bookForm.is_active}
            onChange={(value) => setBookForm((current) => ({ ...current, is_active: value }))}
          />
          <AppButton
            label={editingBookId ? "Save Book" : "Create Book"}
            onPress={() => void handleSaveBook()}
            loading={saveBookMutation.isPending}
          />
        </View>
      </ModalSheet>

      <ModalSheet
        visible={reviewOpen}
        title={
          reviewAction === "approve"
            ? "Approve Request"
            : reviewAction === "reject"
              ? "Reject Request"
              : "Fulfill Request"
        }
        onClose={() => setReviewOpen(false)}
      >
        <View style={{ gap: 16 }}>
          {reviewRequest ? (
            <Card>
              <Text style={{ fontWeight: "800", color: "#102032", fontSize: 16 }}>
                {getRequestTitle(reviewRequest)}
              </Text>
              <Text style={{ color: "#667085" }}>
                {reviewRequest.requester_name || "User"} - {reviewRequest.request_type}
              </Text>
            </Card>
          ) : null}
          {reviewAction === "fulfill" && reviewRequest?.request_type === "loan" ? (
            <Field
              label="Due Date"
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
            />
          ) : null}
          <Field
            label="Review Note"
            value={reviewNote}
            onChangeText={setReviewNote}
            placeholder="Optional note"
            multiline
          />
          <AppButton
            label={
              reviewAction === "approve"
                ? "Approve"
                : reviewAction === "reject"
                  ? "Reject"
                  : "Fulfill"
            }
            variant={reviewAction === "reject" ? "danger" : "primary"}
            onPress={() => void handleReviewRequest()}
            loading={reviewMutation.isPending}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}
