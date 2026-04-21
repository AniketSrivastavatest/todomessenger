create extension if not exists "pgcrypto";

do $$ begin
  create type company_status as enum ('active', 'paused', 'deleted');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type user_role as enum ('admin', 'team_lead', 'employee');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type user_status as enum ('invited', 'active', 'away', 'disabled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type conversation_type as enum ('direct', 'group', 'system');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type conversation_member_role as enum ('owner', 'member');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type task_priority as enum ('low', 'normal', 'high');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type task_status as enum ('open', 'done', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name varchar(160) not null,
  domain varchar(160) not null unique,
  status company_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  email varchar(255) not null unique,
  name varchar(160) not null,
  about varchar(240) not null default 'Available',
  role user_role not null default 'employee',
  status user_status not null default 'active',
  last_login_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_company_role_idx on users(company_id, role);
create index if not exists users_company_status_idx on users(company_id, status);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  email varchar(255) not null,
  role user_role not null default 'employee',
  token varchar(120) not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (company_id, email)
);

create table if not exists auth_codes (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) not null,
  code_hash char(64) not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists auth_codes_email_idx on auth_codes(email, created_at);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name varchar(180) not null,
  type conversation_type not null default 'group',
  created_by uuid null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_members (
  conversation_id uuid not null references conversations(id),
  user_id uuid not null references users(id),
  role conversation_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id),
  sender_id uuid not null references users(id),
  encrypted_body text null,
  plain_preview varchar(280) null,
  attachment_json jsonb null,
  reply_to_json jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx on messages(conversation_id, created_at);

create table if not exists message_reactions (
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  reaction varchar(16) not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction)
);

create index if not exists message_reactions_user_idx on message_reactions(user_id, created_at);

create table if not exists message_reads (
  message_id uuid not null references messages(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_reads_user_idx on message_reads(user_id, read_at);

create table if not exists e2ee_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device_id varchar(120) not null,
  device_label varchar(160) not null default 'Device',
  identity_key jsonb not null,
  signed_prekey_id varchar(120) not null,
  signed_prekey jsonb not null,
  signed_prekey_signature text not null,
  registration_id varchar(120) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz null,
  unique (user_id, device_id)
);

create index if not exists e2ee_devices_user_active_idx on e2ee_devices(user_id, revoked_at);

create table if not exists e2ee_one_time_prekeys (
  user_id uuid not null references users(id) on delete cascade,
  device_id varchar(120) not null,
  prekey_id varchar(120) not null,
  prekey jsonb not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz null,
  primary key (user_id, device_id, prekey_id)
);

create index if not exists e2ee_one_time_prekeys_claim_idx on e2ee_one_time_prekeys(user_id, device_id, claimed_at);

create table if not exists e2ee_conversation_key_envelopes (
  conversation_id uuid not null references conversations(id) on delete cascade,
  recipient_user_id uuid not null references users(id) on delete cascade,
  recipient_device_id varchar(120) not null,
  sender_user_id uuid not null references users(id) on delete cascade,
  envelope_version integer not null default 1,
  algorithm varchar(80) not null default 'x3dh-aes-gcm',
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, recipient_user_id, recipient_device_id)
);

create index if not exists e2ee_key_envelopes_recipient_idx on e2ee_conversation_key_envelopes(recipient_user_id, recipient_device_id);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  conversation_id uuid null references conversations(id),
  title varchar(220) not null,
  description text null,
  assignee_id uuid null references users(id),
  assignee_external varchar(255) null,
  created_by uuid not null references users(id),
  priority task_priority not null default 'normal',
  status task_status not null default 'open',
  due_at timestamptz null,
  reminder_at timestamptz null,
  reminder_sent_at timestamptz null,
  fallback_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_company_status_due_idx on tasks(company_id, status, due_at);
create index if not exists tasks_assignee_status_idx on tasks(assignee_id, status);
create index if not exists tasks_reminder_idx on tasks(reminder_at, reminder_sent_at);

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  token varchar(512) not null unique,
  platform varchar(40) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  provider varchar(80) not null,
  access_token_encrypted text null,
  refresh_token_encrypted text null,
  connected_by uuid null references users(id),
  connected_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, provider)
);

create table if not exists blu_agent_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null references companies(id) on delete cascade,
  user_id uuid null references users(id) on delete set null,
  event_type varchar(80) not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists blu_agent_events_company_created_idx on blu_agent_events(company_id, created_at desc);

create table if not exists blu_agent_policy (
  company_id uuid primary key references companies(id) on delete cascade,
  require_approval boolean not null default true,
  allow_internal_task_creation boolean not null default true,
  allow_external_sync boolean not null default false,
  allow_background_jobs boolean not null default false,
  allowed_providers jsonb not null default '["google_calendar"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists blu_agent_actions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid null references users(id) on delete set null,
  conversation_id uuid null references conversations(id) on delete set null,
  action_type varchar(80) not null,
  title varchar(220) not null,
  assignee varchar(255) not null default 'Me',
  priority task_priority not null default 'normal',
  due_at timestamptz null,
  status varchar(40) not null default 'pending',
  source varchar(80) not null default 'blu',
  reason text null,
  payload_json jsonb not null default '{}'::jsonb,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blu_agent_actions_company_status_idx on blu_agent_actions(company_id, status, created_at desc);

create table if not exists admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  actor_user_id uuid null references users(id) on delete set null,
  action_type varchar(120) not null,
  target_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_events_company_created_idx on admin_audit_events(company_id, created_at desc);
