export type RootStackParamList = {
  Login: undefined;
  Activate: undefined;
  Tabs: undefined;
  Students: undefined;
  Fees: undefined;
  Announcements: undefined;
  Attendance: undefined;
  Library: undefined;
  Structure: undefined;
  Conversation: {
    conversationId: string;
    title?: string;
  };
};

export type RootTabParamList = {
  Dashboard: undefined;
  Workspace: undefined;
  Messages: undefined;
  Sync: undefined;
  Profile: undefined;
};
