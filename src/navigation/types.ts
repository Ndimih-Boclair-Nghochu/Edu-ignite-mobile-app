export type RootStackParamList = {
  Login: undefined;
  Activate: undefined;
  Tabs: undefined;
  Students: undefined;
  Staff: undefined;
  Subjects: undefined;
  Fees: undefined;
  Announcements: undefined;
  Attendance: undefined;
  Library: undefined;
  Structure: undefined;
  Exams: undefined;
  Assignments: undefined;
  LiveClasses: undefined;
  Community: undefined;
  AI: undefined;
  Conversation: {
    conversationId: string;
    title?: string;
  };
};

export type RootTabParamList = {
  Dashboard: undefined;
  Workspace: undefined;
  Messages: undefined;
  Profile: undefined;
};
