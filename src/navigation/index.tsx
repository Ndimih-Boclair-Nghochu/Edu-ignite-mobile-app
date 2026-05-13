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
import { View } from "react-native";
import { ActivityIndicator } from "react-native";
import { DashboardScreen } from "@/screens/app/DashboardScreen";
import { MessagesScreen } from "@/screens/app/MessagesScreen";
import { ProfileScreen } from "@/screens/app/ProfileScreen";
import { WorkspaceScreen } from "@/screens/app/WorkspaceScreen";
import { ActivateAccountScreen } from "@/screens/auth/ActivateAccountScreen";
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
import { StaffScreen } from "@/screens/modules/StaffScreen";
import { StructureScreen } from "@/screens/modules/StructureScreen";
import { StudentsScreen } from "@/screens/modules/StudentsScreen";
import { SubjectsScreen } from "@/screens/modules/SubjectsScreen";
import { ConversationScreen } from "@/screens/shared/ConversationScreen";
import { navigationTheme, palette } from "@/theme";
import { RootStackParamList, RootTabParamList } from "@/navigation/types";
import { useAuth } from "@/providers/AuthProvider";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<RootTabParamList>();

function AppTabs() {
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
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="Workspace"
        component={WorkspaceScreen}
        options={{
          title: "Workspace",
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
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
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="Activate"
              component={ActivateAccountScreen}
              options={{ title: "Activate Account" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Students" component={StudentsScreen} options={{ title: "Students" }} />
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
              name="Conversation"
              component={ConversationScreen}
              options={({ route }) => ({ title: route.params.title ?? "Conversation" })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
