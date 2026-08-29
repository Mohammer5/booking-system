create table "course_invites" (
  "id" text not null primary key,
  "course_id" text not null
    references "courses" ("id") on delete restrict,
  "token_digest" text not null unique
    check (
      length("token_digest") = 64
      and "token_digest" not glob '*[^0-9a-f]*'
    ),
  "recoverable_token" text
    check (
      "recoverable_token" is null
      or (
        length("recoverable_token") = 64
        and "recoverable_token" not glob '*[^0-9a-f]*'
      )
    ),
  "is_enabled" integer not null check ("is_enabled" in (0, 1)),
  "is_current" integer not null check ("is_current" in (0, 1)),
  "replaces_invite_id" text unique,
  "replacement_invite_id" text unique,
  check (
    (
      "is_current" = 1
      and "recoverable_token" is not null
      and "replacement_invite_id" is null
    )
    or (
      "is_current" = 0
      and "recoverable_token" is null
      and "replacement_invite_id" is not null
    )
  ),
  check (
    "replaces_invite_id" is null
    or "replaces_invite_id" <> "id"
  ),
  check (
    "replacement_invite_id" is null
    or "replacement_invite_id" <> "id"
  )
);

create unique index "course_invites_one_current_per_course_uidx"
  on "course_invites" ("course_id")
  where "is_current" = 1;

create trigger "course_invites_course_ownership_is_permanent"
before update of "course_id" on "course_invites"
when old."course_id" <> new."course_id"
begin
  select raise(abort, 'Course Invite Course ownership is permanent');
end;

create trigger "course_invites_token_digest_is_permanent"
before update of "token_digest" on "course_invites"
when old."token_digest" <> new."token_digest"
begin
  select raise(abort, 'Course Invite token digest is permanent');
end;

create trigger "course_invites_replacement_requires_predecessor"
before insert on "course_invites"
when new."replaces_invite_id" is not null
  and not exists (
    select 1
      from "course_invites" predecessor
     where predecessor."id" = new."replaces_invite_id"
       and predecessor."course_id" = new."course_id"
       and predecessor."is_current" = 0
       and predecessor."recoverable_token" is null
       and predecessor."replacement_invite_id" = new."id"
  )
begin
  select raise(abort, 'Course Invite replacement requires predecessor');
end;
