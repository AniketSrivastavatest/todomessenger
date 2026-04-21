# TodoMessenger STATION F Application Brief

## One-Line Pitch

TodoMessenger helps company teams turn scattered workplace conversations into assigned, trackable tasks using AI.

## Short Pitch

TodoMessenger is an AI-powered workplace messenger built for teams that lose action items across chat, meetings, emails, and informal work conversations. The product combines a familiar messaging interface with task assignment, reminders, company workspaces, admin invites, and Blu, an AI assistant that can read chat context and suggest follow-up tasks.

The wedge is simple: instead of asking employees to manually move work from conversations into a separate project management tool, TodoMessenger turns the conversation itself into the starting point for execution.

## Problem

Modern work is fragmented. A single task can originate in WhatsApp, Microsoft Teams, Gmail, Slack, Zoom, Google Meet, or a quick side conversation. Employees often remember the discussion but forget the action item. Managers struggle to know whether a follow-up was captured, assigned, or completed.

This is especially painful for small and mid-sized companies where process is still informal, but the volume of communication is already high.

## Target Customer

Initial target customers:

- Small and mid-sized companies with 20-500 employees.
- Agencies, consulting teams, operations teams, sales teams, and distributed teams.
- Companies where employees already use messaging heavily but lack reliable task capture.
- Teams that use tools like Jira, Asana, Gmail, Microsoft Teams, WhatsApp, Slack, Google Meet, or Zoom.

Economic buyer:

- Founder, COO, Head of Operations, HR/Admin, Team Lead, or IT owner.

Daily users:

- Employees, managers, team leads, project coordinators, and operations staff.

## Solution

TodoMessenger gives companies a familiar chat interface with built-in work execution:

- Company workspaces and admin invite flow.
- Employee and team lead roles.
- Recent chats, private chats, and workspace chats.
- Inline task creation directly from chat.
- Task assignment, due dates, reminders, and visual confirmation.
- Blu AI assistant for chat-based answers and task suggestions.
- PostgreSQL backend, email authentication, and live API sync.
- Planned integrations with Asana, Jira, Gmail, Teams, Zoom, Google Meet, and other work tools.

## Why Now

AI has made it possible to understand workplace context and extract actionable tasks from unstructured conversations. At the same time, employees are overwhelmed by too many communication tools, and companies are looking for simpler ways to improve productivity without forcing teams into rigid project management workflows.

TodoMessenger meets users where work already happens: in conversations.

## Differentiation

TodoMessenger is not another project management board and not just another chat app.

The product is differentiated by:

- Conversation-first task capture.
- AI-assisted action item detection.
- A familiar messaging UX that reduces adoption friction.
- Company onboarding and role-based workflows.
- Cross-tool import vision for WhatsApp, Teams, Gmail, Zoom, Google Meet, and similar tools.
- Enterprise direction: workspaces, roles, reminders, notifications, integrations, and eventually stronger security/E2EE.

## Current Progress

Prototype and early production foundation already built:

- Static web frontend.
- Render backend deployment.
- PostgreSQL database connection.
- Email authentication flow.
- Company workspace structure.
- Admin invite onboarding flow.
- Role-based UI foundation.
- Chat interface inspired by familiar messenger patterns.
- Inline task creation from chat.
- Task assignment, due dates, reminders, and notifications groundwork.
- Blu AI assistant connected to OpenAI.
- WebSocket/backend API foundation.
- Android native prototype path started.

## Business Model

Likely B2B SaaS model:

- Free pilot for small teams.
- Per-seat monthly pricing for companies.
- Premium tiers for AI usage, integrations, admin controls, analytics, and compliance features.
- Possible enterprise plan for larger companies with SSO, audit logs, data retention, and custom integrations.

## Go-To-Market Wedge

Initial wedge:

“Never lose a task from chat again.”

Early customer segments:

- Paris-based startups and agencies.
- Small operations-heavy companies.
- Consulting and client-service teams.
- Teams already using WhatsApp/Teams/Gmail informally for work.

First pilot motion:

1. Recruit 3-5 small teams.
2. Focus on chat-to-task conversion.
3. Measure tasks captured, reminders completed, and reduction in missed follow-ups.
4. Use feedback to refine integrations and admin flows.

## What We Need From STATION F

We want to join STATION F to accelerate:

- B2B SaaS positioning.
- Customer discovery with real companies.
- Enterprise workflow design.
- Mentor feedback on AI/productivity tools.
- Partnerships with workplace software providers.
- Fundraising readiness.
- Access to Paris and European startup operators.

## Application Positioning

TodoMessenger should be positioned as:

> An AI productivity layer for workplace conversations.

Avoid positioning it as:

> A WhatsApp clone.

The strongest version is:

> TodoMessenger turns conversations from chat, meetings, and email into assigned, trackable tasks for company teams.

## Key Risks To Address

- Need to prove teams want a dedicated chat/task product instead of another integration inside existing tools.
- Need to define the initial wedge clearly: chat-to-task capture.
- Need to improve production security before enterprise use.
- Need to handle privacy carefully when AI reads work conversations.
- Need to prioritize one or two integrations first instead of trying to support every tool at once.

## Near-Term Roadmap

1. Harden company onboarding and invite flows.
2. Add proper team lead permissions.
3. Add task assignment inbox and status tracking.
4. Add first real integration: Gmail or Microsoft Teams.
5. Improve Blu task extraction and privacy controls.
6. Add admin dashboard for employees, integrations, and task activity.
7. Prepare pilot program with 3-5 teams.

