-- Better Auth 1.7.2 core schema generated for its built-in Kysely/D1 adapter
-- with `auth generate`'s supported programmatic migration engine.
create table "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" integer not null,
  "image" text,
  "createdAt" date not null,
  "updatedAt" date not null
);

create table "session" (
  "id" text not null primary key,
  "expiresAt" date not null,
  "token" text not null unique,
  "createdAt" date not null,
  "updatedAt" date not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table "account" (
  "id" text not null primary key,
  "issuer" text not null,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" date,
  "refreshTokenExpiresAt" date,
  "scope" text,
  "password" text,
  "createdAt" date not null,
  "updatedAt" date not null
);

create table "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" date not null,
  "createdAt" date not null,
  "updatedAt" date not null
);

create index "session_userId_idx" on "session" ("userId");
create index "account_userId_idx" on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");
create unique index "account_issuer_accountId_uidx"
  on "account" ("issuer", "accountId");

create table "admin_users" (
  "id" text not null primary key,
  "external_principal_id" text not null unique,
  "name" text not null check (length(trim("name")) > 0),
  "state" text not null check ("state" in ('active', 'disabled')),
  "authority" text not null check ("authority" in ('admin', 'super-admin'))
);

create table "admin_bootstrap_history" (
  "singleton" integer not null primary key check ("singleton" = 1),
  "first_admin_user_id" text unique
    references "admin_users" ("id") on delete set null,
  "completed_at" integer not null
);
