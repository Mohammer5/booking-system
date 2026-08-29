create table "admin_invites" (
  "id" text not null primary key,
  "token_digest" text not null unique
    check (
      length("token_digest") = 64
      and "token_digest" not glob '*[^0-9a-f]*'
    ),
  "created_by_admin_user_id" text
    references "admin_users" ("id") on delete set null,
  "created_at" integer not null check ("created_at" >= 0),
  "state" text not null check ("state" in ('active', 'claimed', 'revoked'))
);

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
