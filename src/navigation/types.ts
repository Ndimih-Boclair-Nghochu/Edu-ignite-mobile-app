export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  PublicCommunity: undefined;
  PublicHighlights: undefined;
  PublicLogs: undefined;
  PublicLogDetail: {
    blogId: string;
    title?: string;
  };
  Activate: undefined;
  ForgotPassword: undefined;
  Tabs: undefined;
  Founders: undefined;
  Schools: undefined;
  Support: undefined;
  Testimonials: undefined;
  PlatformSettings: undefined;
  SchoolSettings: undefined;
  Insights: undefined;
  Rewards: undefined;
  Subscription: undefined;
  Students: undefined;
  Children: undefined;
  IDCards: undefined;
  Transcripts: undefined;
  Grades: undefined;
  Staff: undefined;
  Subjects: undefined;
  Fees: undefined;
  Announcements: undefined;
  Feedback: undefined;
  Attendance: undefined;
  Library: undefined;
  Structure: undefined;
  Exams: undefined;
  Assignments: undefined;
  LiveClasses: undefined;
  Community: undefined;
  AI: undefined;
  Schedule: undefined;
  LogPost: undefined;
  AIFeedback: undefined;
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
