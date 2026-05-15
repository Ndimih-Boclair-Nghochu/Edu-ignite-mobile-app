import type {
  Conversation,
  ConversationParticipant,
  FounderProfile,
  Message,
  MessageSender,
  PlatformSettings,
  School,
  User,
} from "./types";
import { resolveMediaUrl } from "@/lib/media";
import { normalizeTutorialLinksRecord } from "@/lib/tutorial-links";

export function normalizeSchool(school: Record<string, any> | undefined | null): School | undefined {
  if (!school) return undefined;

  return {
    ...(school as School),
    id: school.id ?? "",
    name: school.name ?? "",
    short_name: school.short_name ?? school.shortName ?? "",
    shortName: school.shortName ?? school.short_name ?? "",
    principal: school.principal ?? "",
    motto: school.motto ?? "",
    logo: resolveMediaUrl(school.logo),
    banner: resolveMediaUrl(school.banner),
    description: school.description ?? "",
    location: school.location ?? "",
    region: school.region ?? "",
    division: school.division ?? "",
    sub_division: school.sub_division ?? school.subDivision ?? "",
    subDivision: school.subDivision ?? school.sub_division ?? "",
    city_village: school.city_village ?? school.cityVillage ?? "",
    cityVillage: school.cityVillage ?? school.city_village ?? "",
    address: school.address ?? "",
    postal_code: school.postal_code ?? school.postalCode ?? "",
    postalCode: school.postalCode ?? school.postal_code ?? "",
    phone: school.phone ?? "",
    email: school.email ?? "",
    status: school.status ?? "",
    student_count: school.student_count ?? school.studentCount ?? 0,
    studentCount: school.studentCount ?? school.student_count ?? 0,
    teacher_count: school.teacher_count ?? school.teacherCount ?? 0,
    teacherCount: school.teacherCount ?? school.teacher_count ?? 0,
  };
}

export function normalizeUser(user: Record<string, any> | undefined | null): User {
  const school = normalizeSchool(user?.school);

  return {
    ...(user as User),
    id: user?.id ?? "",
    uid: user?.uid ?? "",
    matricule: user?.matricule ?? "",
    avatar: resolveMediaUrl(user?.avatar),
    phone: user?.phone ?? "",
    whatsapp: user?.whatsapp ?? "",
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "STUDENT",
    school,
    schoolId: user?.schoolId ?? user?.school_id ?? school?.id ?? null,
    school_id: user?.school_id ?? user?.schoolId ?? school?.id ?? null,
    isLicensePaid: user?.isLicensePaid ?? user?.is_license_paid ?? false,
    is_license_paid: user?.is_license_paid ?? user?.isLicensePaid ?? false,
    aiRequestCount: user?.aiRequestCount ?? user?.ai_request_count ?? 0,
    ai_request_count: user?.ai_request_count ?? user?.aiRequestCount ?? 0,
    annualAvg: user?.annualAvg ?? user?.annual_avg,
    annual_avg: user?.annual_avg ?? user?.annualAvg,
    isPlatformExecutive: user?.isPlatformExecutive ?? user?.is_platform_executive,
    is_platform_executive: user?.is_platform_executive ?? user?.isPlatformExecutive,
    isSchoolAdmin: user?.isSchoolAdmin ?? user?.is_school_admin,
    is_school_admin: user?.is_school_admin ?? user?.isSchoolAdmin,
  };
}

export function normalizeFounder(founder: Record<string, any> | undefined | null): FounderProfile {
  return {
    ...(founder as FounderProfile),
    id: founder?.id ?? "",
    user_id: founder?.user_id ?? "",
    matricule: founder?.matricule ?? "",
    name: founder?.name ?? "",
    email: founder?.email ?? "",
    phone: founder?.phone ?? "",
    whatsapp: founder?.whatsapp ?? "",
    role: founder?.role ?? "INV",
    avatar: resolveMediaUrl(founder?.avatar),
    founder_title: founder?.founder_title ?? "",
    primary_share_percentage: founder?.primary_share_percentage ?? "0",
    additional_share_percentage: founder?.additional_share_percentage ?? "0",
    total_share_percentage: founder?.total_share_percentage ?? "0",
    is_primary_founder: founder?.is_primary_founder ?? false,
    can_be_removed: founder?.can_be_removed ?? false,
    is_active: founder?.is_active ?? true,
    has_renewable_shares: founder?.has_renewable_shares ?? false,
    share_renewal_period_days: founder?.share_renewal_period_days ?? 0,
    shares_expire_at: founder?.shares_expire_at ?? null,
    is_share_expired: founder?.is_share_expired ?? false,
    days_until_share_expiry: founder?.days_until_share_expiry ?? null,
    access_level: founder?.access_level ?? "FULL",
    share_adjustments: founder?.share_adjustments ?? [],
    created_at: founder?.created_at ?? "",
    updated_at: founder?.updated_at ?? "",
  };
}

export function normalizePlatformSettings(
  settings: Record<string, any> | undefined | null
): PlatformSettings {
  return {
    ...(settings as PlatformSettings),
    name: settings?.name ?? "EduIgnite",
    logo: resolveMediaUrl(settings?.logo),
    payment_deadline: settings?.payment_deadline ?? settings?.paymentDeadline ?? "",
    paymentDeadline: settings?.paymentDeadline ?? settings?.payment_deadline ?? "",
    honour_roll_threshold:
      settings?.honour_roll_threshold ?? settings?.honourRollThreshold ?? 15,
    honourRollThreshold:
      settings?.honourRollThreshold ?? settings?.honour_roll_threshold ?? 15,
    fees: settings?.fees ?? {},
    tutorial_links: normalizeTutorialLinksRecord(
      settings?.tutorial_links ?? settings?.tutorialLinks ?? {}
    ),
    tutorialLinks: normalizeTutorialLinksRecord(
      settings?.tutorialLinks ?? settings?.tutorial_links ?? {}
    ),
  };
}

export function normalizeConversationParticipant(
  participant: Record<string, any> | undefined | null
): ConversationParticipant {
  return {
    id: participant?.id ?? participant?.user_id ?? "",
    name: participant?.name ?? participant?.user_name ?? "",
    avatar: resolveMediaUrl(participant?.avatar ?? participant?.user_avatar),
    email: participant?.email ?? participant?.user_email ?? "",
    role: participant?.role ?? "",
  };
}

export function normalizeMessageSender(
  sender: Record<string, any> | undefined | null
): MessageSender {
  return {
    id: sender?.id ?? sender?.sender_id ?? "",
    name: sender?.name ?? sender?.sender_name ?? "",
    avatar: resolveMediaUrl(sender?.avatar ?? sender?.sender_avatar),
  };
}

export function normalizeMessage(message: Record<string, any> | undefined | null): Message {
  const sender = normalizeMessageSender({
    id: message?.sender?.id ?? message?.sender_id,
    name: message?.sender?.name ?? message?.sender_name,
    avatar: message?.sender?.avatar ?? message?.sender_avatar,
  });

  return {
    ...(message as Message),
    id: message?.id ?? "",
    conversation: message?.conversation ?? message?.conversation_id ?? "",
    sender,
    sender_id: sender.id,
    sender_name: sender.name,
    sender_avatar: sender.avatar,
    text: message?.text ?? "",
    message_type: message?.message_type ?? "text",
    attachment: message?.attachment ?? null,
    is_official: message?.is_official ?? false,
    is_read: message?.is_read ?? false,
    read_at: message?.read_at ?? null,
    reply_to: message?.reply_to ?? undefined,
    reply_to_text: message?.reply_to_text ?? null,
    created_at: message?.created_at ?? new Date().toISOString(),
    is_deleted: message?.is_deleted ?? false,
  };
}

export function normalizeConversation(
  conversation: Record<string, any> | undefined | null
): Conversation {
  return {
    ...(conversation as Conversation),
    id: conversation?.id ?? "",
    participants: Array.isArray(conversation?.participants)
      ? conversation.participants.map((participant: Record<string, any>) =>
          normalizeConversationParticipant(participant)
        )
      : [],
    conversation_type: conversation?.conversation_type ?? "direct",
    name: conversation?.name ?? "",
    last_message: conversation?.last_message ?? "",
    last_message_at: conversation?.last_message_at ?? "",
    school_class: conversation?.school_class ?? null,
    school_class_name: conversation?.school_class_name ?? "",
    subject: conversation?.subject ?? null,
    subject_name: conversation?.subject_name ?? "",
    only_admins_can_send: conversation?.only_admins_can_send ?? false,
    admin_participant_ids: conversation?.admin_participant_ids ?? [],
    is_current_user_admin: conversation?.is_current_user_admin ?? false,
    unread_count: conversation?.unread_count ?? 0,
    participant_count:
      conversation?.participant_count ??
      (Array.isArray(conversation?.participants) ? conversation.participants.length : 0),
    recent_messages: Array.isArray(conversation?.recent_messages)
      ? conversation.recent_messages.map((message: Record<string, any>) =>
          normalizeMessage(message)
        )
      : [],
  };
}
