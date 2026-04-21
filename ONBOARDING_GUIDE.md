# TodoMessenger Onboarding Guide

## Goal

Help a new company move from first login to useful daily work in under 10 minutes.

TodoMessenger onboarding has two paths:

- Admin onboarding: create the workspace, invite employees, choose roles, connect tools.
- Employee onboarding: join the workspace, complete profile, chat, create tasks, use Blu.

## Admin Flow

### 1. Sign in with work email

The admin enters a company email address and verifies the email code.

Expected result:

- A company workspace is created from the email domain if one does not already exist.
- The first user for a workspace becomes Admin.

### 2. Complete profile

The admin adds:

- Name
- About/status

Expected result:

- Profile is saved to the backend.
- The admin lands on the main TodoMessenger interface.

### 3. Open Workspace

The admin opens the Workspace tab.

Expected result:

- Company name is visible.
- Company domain is visible.
- Admin badge is visible.

### 4. Invite employees

The admin enters an employee email and selects a role:

- Admin
- Team lead
- Employee

Expected result:

- The employee receives or is given an invite code/link.
- The invited employee is attached to the same workspace.

### 5. Connect tools

The admin opens Integrations and connects approved company tools.

Initial targets:

- Asana
- Jira
- Gmail
- Microsoft Teams
- Zoom or Google Meet transcripts

Expected result:

- TodoMessenger becomes the action layer for workplace conversations.

## Employee Flow

### 1. Sign in with invited work email

The employee enters the invited email address and verifies the email code.

Expected result:

- The employee joins the same company workspace.
- The employee gets the correct role.

### 2. Complete profile

The employee adds a name and status.

Expected result:

- The profile is saved.
- The employee lands on recent chats.

### 3. Start chatting

The employee opens a workspace chat or private chat.

Expected result:

- Messages are synced with the backend.
- Realtime updates appear through WebSockets.

### 4. Turn a message into a task

The employee can:

- Click Add task on a message.
- Enter task title.
- Assign owner.
- Add due date.
- Add reminder.

Expected result:

- Task appears in the chat.
- Task appears in the Tasks tab.
- Reminder can trigger a push notification.

### 5. Use Blu

The employee can type:

```text
@blu suggest tasks from this chat
```

Expected result:

- Blu reads approved recent chat context.
- Blu suggests tasks, summaries, or follow-ups.

## Team Lead Flow

Team leads sit between admin and employee.

They can:

- Chat with team members.
- Assign tasks.
- Track due dates.
- Follow up on incomplete work.

They should not manage company-level settings unless given admin access.

## What Success Looks Like

A successful onboarding session means:

- Admin can invite at least one employee.
- Employee can join the same workspace.
- A chat message can become a task.
- A task can be assigned.
- A reminder can be set.
- Blu can respond when the AI backend is configured.

## Suggested Pilot Checklist

- Invite 5 to 10 users from one team.
- Run one real project conversation inside TodoMessenger.
- Ask every user to create at least one task from chat.
- Ask team lead to assign at least three tasks.
- Test one reminder notification.
- Test one Blu task suggestion.
- Review feedback after 3 working days.

