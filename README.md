# TodoMessenger

A lightweight WhatsApp-style messaging prototype with to-do tasks integrated into each conversation.

## Run it

Open `index.html` in a browser. No build step is needed.

## Publish the demo

This is a static app, so the public demo can be deployed from this folder with no build command.

For the full frontend/backend deployment flow, see `DEPLOYMENT.md`.

### Netlify

1. Go to https://app.netlify.com/drop
2. Drag this project folder into the page.
3. Netlify will create a public demo URL.

### Vercel

1. Create a new Vercel project.
2. Import this folder or a Git repository containing these files.
3. Leave the build command empty and use `.` as the output directory.

## What is included

- Conversation list with search across people, groups, and task text.
- WhatsApp-style registration flow with phone entry, verification code, and profile setup.
- WhatsApp Web-style desktop layout with recent chats on the left and the active conversation on the right.
- Mobile keeps WhatsApp-style navigation with a clean recent chats home screen and a separate chat screen.
- BBM Messenger-inspired visual palette with blue accents and charcoal details.
- Active chat screen with message history, back navigation, call/video/more actions, and a message composer.
- Browser-side AES-GCM message encryption before messages are stored in local demo state.
- `@chatgpt` mention flow that calls the backend AI endpoint when `OPENAI_API_KEY` is configured.
- AI task suggestions that read recent decrypted messages only after the user taps the suggestion button.
- Separate Tasks tab for adding and managing to-dos without cluttering the chat screen.
- Direct task creation from the composer or from any chat message.
- Invite sharing through native phone sharing, WhatsApp, Instagram, SMS, email, and copy link.
- MCP-style connected app registry with a manifest preview.
- Backend scaffold for Asana/Jira OAuth and task/issue sync.
- Per-chat tasks with due dates, priority, completion, deletion, and filters.
- `/todo` shortcut in the composer, for example `/todo Send invoice by Friday`.
- Local persistence with `localStorage`.
- Demo reset button for getting back to seeded data.

## Good next steps

1. Add authentication and user profiles.
2. Replace `localStorage` with a backend API.
3. Add realtime messaging through WebSockets or a hosted realtime service.
4. Configure `OPENAI_API_KEY` for live `@chatgpt` answers.
5. Configure the backend OAuth apps for Asana and Jira.
6. Replace the development token store with an encrypted database.
7. Replace demo encryption with true multi-device E2EE key exchange.
8. Add task assignment, reminders, and notifications.
9. Add media messages, message reactions, and read receipts.
