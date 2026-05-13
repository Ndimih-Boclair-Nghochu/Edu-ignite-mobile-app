# EduIgnite Mobile

React Native + Expo front-end for EduIgnite, using the same backend as the web platform.

## What is included

- Shared EduIgnite API layer copied from the web app and adapted for React Native
- Role-aware login for school admins, sub admins, teachers, bursars, librarians, students, and parents
- Offline-ready mobile session restore after the first successful online login on a device
- Persisted query cache and queued sync actions
- Connected mobile screens for:
  - dashboard overview
  - workspace routing
  - messages and conversations
  - sync center
  - profile
  - students
  - fees portal
  - announcements
  - attendance
  - library
  - hierarchy and sections
- Expo Go compatible project structure

## Backend

Set the same deployed backend used by the web app:

```bash
EXPO_PUBLIC_API_URL=https://your-backend-domain/api/v1
```

You can place it in a local `.env` file before starting Expo.

## Expo Go

1. Install dependencies:

```bash
npm install
```

2. Set the backend URL:

```bash
copy .env.example .env
```

Then update `EXPO_PUBLIC_API_URL` in `.env`.

3. Start Expo:

```bash
npm run start
```

4. Open the QR code in Expo Go on your device.

If your backend blocks local-device access, make sure the mobile device can reach the deployed API domain directly.

## Offline behavior

- First login on a device must happen online
- After that, the same device can reopen the app offline
- Cached data stays visible from React Query persistence
- Supported offline actions are queued and synced later:
  - student admissions
  - announcements
  - school fee assignments
  - learner fee status updates
  - chat replies in existing conversations
  - attendance batches
  - library requests
  - sub-school and class creation

## Verification

- `npm run typecheck`
- `npx expo export --platform web`
