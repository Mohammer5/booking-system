-- Admin deletion removes only the current identity. Accepted bootstrap and
-- Invite attribution remain historical facts after that identity is gone.
alter table "admin_bootstrap_history"
  rename to "admin_bootstrap_history_with_current_admin_reference";

create table "admin_bootstrap_history" (
  "singleton" integer not null primary key check ("singleton" = 1),
  "first_admin_user_id" text unique,
  "completed_at" integer not null
);

insert into "admin_bootstrap_history"
  ("singleton", "first_admin_user_id", "completed_at")
select "singleton", "first_admin_user_id", "completed_at"
  from "admin_bootstrap_history_with_current_admin_reference";

drop table "admin_bootstrap_history_with_current_admin_reference";

drop trigger "admin_invites_identity_is_permanent";
drop trigger "admin_invites_state_is_terminal";
drop index "admin_invites_created_at_idx";

alter table "admin_invites"
  rename to "admin_invites_with_current_admin_reference";

create table "admin_invites" (
  "id" text not null primary key,
  "token_digest" text not null unique
    check (
      length("token_digest") = 64
      and "token_digest" not glob '*[^0-9a-f]*'
    ),
  "created_by_admin_user_id" text,
  "created_at" integer not null check ("created_at" >= 0),
  "state" text not null check ("state" in ('active', 'claimed', 'revoked'))
);

insert into "admin_invites"
  ("id", "token_digest", "created_by_admin_user_id", "created_at", "state")
select "id", "token_digest", "created_by_admin_user_id", "created_at", "state"
  from "admin_invites_with_current_admin_reference";

drop table "admin_invites_with_current_admin_reference";

create index "admin_invites_created_at_idx"
  on "admin_invites" ("created_at" desc, "id" asc);

create trigger "admin_invites_identity_is_permanent"
before update of "id", "token_digest", "created_at" on "admin_invites"
when new."id" is not old."id"
  or new."token_digest" is not old."token_digest"
  or new."created_at" is not old."created_at"
begin
  select raise(abort, 'Admin Invite identity and creation are permanent');
end;

create trigger "admin_invites_state_is_terminal"
before update of "state" on "admin_invites"
when new."state" is not old."state"
  and (
    old."state" <> 'active'
    or new."state" not in ('claimed', 'revoked')
  )
begin
  select raise(abort, 'Admin Invite transition is not allowed');
end;
