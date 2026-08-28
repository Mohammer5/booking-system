create table "course_assignments" (
  "id" text not null primary key,
  "participant_id" text not null
    references "participants" ("id") on delete restrict,
  "course_id" text not null
    references "courses" ("id") on delete restrict,
  "state" text not null check ("state" in ('active', 'revoked')),
  unique ("participant_id", "course_id")
);

create trigger "course_assignments_participant_ownership_is_permanent"
before update of "participant_id" on "course_assignments"
when old."participant_id" <> new."participant_id"
begin
  select raise(abort, 'Course Assignment Participant ownership is permanent');
end;

create trigger "course_assignments_course_ownership_is_permanent"
before update of "course_id" on "course_assignments"
when old."course_id" <> new."course_id"
begin
  select raise(abort, 'Course Assignment Course ownership is permanent');
end;
