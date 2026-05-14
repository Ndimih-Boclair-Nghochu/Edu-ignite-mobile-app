import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Bell,
  CreditCard,
  LayoutGrid,
  MessageSquare,
  UserCircle2,
} from "lucide-react-native";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { DashboardScreen } from "@/screens/app/DashboardScreen";
import { MessagesScreen } from "@/screens/app/MessagesScreen";
import { ProfileScreen } from "@/screens/app/ProfileScreen";
import { WorkspaceScreen } from "@/screens/app/WorkspaceScreen";
import { ActivateAccountScreen } from "@/screens/auth/ActivateAccountScreen";
import { LandingScreen } from "@/screens/auth/LandingScreen";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { AnnouncementsScreen } from "@/screens/modules/AnnouncementsScreen";
import { AIScreen } from "@/screens/modules/AIScreen";
import { AssignmentsScreen } from "@/screens/modules/AssignmentsScreen";
import { AttendanceScreen } from "@/screens/modules/AttendanceScreen";
import { CommunityScreen } from "@/screens/modules/CommunityScreen";
import { ExamsScreen } from "@/screens/modules/ExamsScreen";
import { FeesScreen } from "@/screens/modules/FeesScreen";
import { LibraryScreen } from "@/screens/modules/LibraryScreen";
import { LiveClassesScreen } from "@/screens/modules/LiveClassesScreen";
import {
  ChildrenScreen,
  FeedbackScreen,
  GradesScreen,
  IDCardsScreen,
  InsightsScreen,
  RewardsScreen,
  ScheduleScreen,
  SchoolSettingsScreen,
  SubscriptionScreen,
  TranscriptsScreen,
} from "@/screens/modules/ParityScreens";
import {
  FoundersScreen,
  PlatformSettingsScreen,
  SchoolsScreen,
  SupportScreen,
  TestimonialsScreen,
} from "@/screens/modules/PlatformScreens";
import { StaffScreen } from "@/screens/modules/StaffScreen";
import { StructureScreen } from "@/screens/modules/StructureScreen";
import { StudentsScreen } from "@/screens/modules/StudentsScreen";
import { SubjectsScreen } from "@/screens/modules/SubjectsScreen";
import { ConversationScreen } from "@/screens/shared/ConversationScreen";
import { navigationTheme, palette } from "@/theme";
import { RootStackParamList, RootTabParamList } from "@/navigation/types";
import { useAuth } from "@/providers/AuthProvider";
import { useI18n } from "@/providers/I18nProvider";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<RootTabParamList>();

function AppTabs() {
  const { t } = useI18n();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: t("overview", "Overview"),
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="Workspace"
        component={WorkspaceScreen}
        options={{
          title: t("workspace", "Workspace"),
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: t("messages", "Messages"),
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t("profile", "Profile"),
          tabBarIcon: ({ color, size }) => <UserCircle2 color={color} size={size} />,
        }}
      />
    </Tabs.Navigator>
  );
}

function SplashGate() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color={palette.primary} size="large" />
    </View>
  );
}

export function Navigation() {
  const { isAuthenticated, isReady } = useAuth();
  const { t } = useI18n();

  if (!isReady) {
    return <SplashGate />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: palette.surface },
          headerTintColor: palette.primary,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: "800",
          },
          contentStyle: {
            backgroundColor: palette.background,
          },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="Activate"
              component={ActivateAccountScreen}
              options={{ title: t("activateAccount", "Activate Account") }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Founders" component={FoundersScreen} options={{ title: "Founders" }} />
            <Stack.Screen name="Schools" component={SchoolsScreen} options={{ title: "Schools" }} />
            <Stack.Screen name="Support" component={SupportScreen} options={{ title: "Support Registry" }} />
            <Stack.Screen name="Testimonials" component={TestimonialsScreen} options={{ title: "Testimonials" }} />
            <Stack.Screen name="PlatformSettings" component={PlatformSettingsScreen} options={{ title: "Portfolio & Policy" }} />
            <Stack.Screen name="SchoolSettings" component={SchoolSettingsScreen} options={{ title: "Manage Settings" }} />
            <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: "Strategic Insights" }} />
            <Stack.Screen name="Rewards" component={RewardsScreen} options={{ title: "Academic Reward" }} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: "Subscription" }} />
            <Stack.Screen name="Students" component={StudentsScreen} options={{ title: "Students" }} />
            <Stack.Screen name="Children" component={ChildrenScreen} options={{ title: "My Children" }} />
            <Stack.Screen name="IDCards" component={IDCardsScreen} options={{ title: "ID Cards" }} />
            <Stack.Screen name="Transcripts" component={TranscriptsScreen} options={{ title: "Transcripts" }} />
            <Stack.Screen name="Grades" component={GradesScreen} options={{ title: "Report Card" }} />
            <Stack.Screen name="Staff" component={StaffScreen} options={{ title: "Staff" }} />
            <Stack.Screen
              name="Subjects"
              component={SubjectsScreen}
              options={{ title: "Institutional Subjects" }}
            />
            <Stack.Screen name="Fees" component={FeesScreen} options={{ title: "Fees Portal" }} />
            <Stack.Screen
              name="Announcements"
              component={AnnouncementsScreen}
              options={{
                title: "Announcements",
                headerRight: () => <Bell color={palette.primary} size={18} />,
              }}
            />
            <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: "Feedback" }} />
            <Stack.Screen
              name="Attendance"
              component={AttendanceScreen}
              options={{ title: "Attendance" }}
            />
            <Stack.Screen name="Library" component={LibraryScreen} options={{ title: "Library" }} />
            <Stack.Screen
              name="Structure"
              component={StructureScreen}
              options={{ title: "Hierarchy & Sections" }}
            />
            <Stack.Screen
              name="Exams"
              component={ExamsScreen}
              options={{ title: "Exams & Schedules" }}
            />
            <Stack.Screen
              name="Assignments"
              component={AssignmentsScreen}
              options={{ title: "Assignments" }}
            />
            <Stack.Screen
              name="LiveClasses"
              component={LiveClassesScreen}
              options={{ title: "Live Classes" }}
            />
            <Stack.Screen
              name="Community"
              component={CommunityScreen}
              options={{ title: "Community & Support" }}
            />
            <Stack.Screen
              name="AI"
              component={AIScreen}
              options={{ title: "AI Assistant" }}
            />
            <Stack.Screen
              name="Schedule"
              component={ScheduleScreen}
              options={{ title: "Schedule" }}
            />
            <Stack.Screen
              name="Conversation"
              component={ConversationScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
