export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  users: {
    list: (params?: Record<string, unknown>) => ["users", "list", params ?? {}] as const,
  },
  schools: {
    me: ["schools", "me"] as const,
    staff: ["schools", "hierarchy", "staff"] as const,
    subSchools: ["schools", "hierarchy", "sub-schools"] as const,
    classes: (params?: Record<string, unknown>) =>
      ["schools", "hierarchy", "classes", params ?? {}] as const,
    subjects: (params?: Record<string, unknown>) =>
      ["schools", "hierarchy", "subjects", params ?? {}] as const,
  },
  students: {
    summary: ["students", "summary"] as const,
    list: (params?: Record<string, unknown>) => ["students", "list", params ?? {}] as const,
    honourRoll: ["students", "honour-roll"] as const,
    children: ["students", "children"] as const,
  },
  announcements: {
    feed: (params?: Record<string, unknown>) =>
      ["announcements", "feed", params ?? {}] as const,
  },
  fees: {
    summary: (params?: Record<string, unknown>) => ["fees", "summary", params ?? {}] as const,
    assignments: (params?: Record<string, unknown>) =>
      ["fees", "assignments", params ?? {}] as const,
    records: (params?: Record<string, unknown>) => ["fees", "records", params ?? {}] as const,
  },
  attendance: {
    sessions: (params?: Record<string, unknown>) =>
      ["attendance", "sessions", params ?? {}] as const,
    records: (params?: Record<string, unknown>) =>
      ["attendance", "records", params ?? {}] as const,
    mine: (params?: Record<string, unknown>) => ["attendance", "mine", params ?? {}] as const,
  },
  library: {
    books: (params?: Record<string, unknown>) => ["library", "books", params ?? {}] as const,
    stats: ["library", "stats"] as const,
    requests: (params?: Record<string, unknown>) =>
      ["library", "requests", params ?? {}] as const,
  },
  chat: {
    conversations: ["chat", "conversations"] as const,
    relatedUsers: ["chat", "related-users"] as const,
    messages: (conversationId: string) => ["chat", "messages", conversationId] as const,
  },
};
