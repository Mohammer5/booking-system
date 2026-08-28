create unique index "modules_id_course_uidx"
  on "modules" ("id", "course_id");

create unique index "groups_id_course_uidx"
  on "groups" ("id", "course_id");

create table "module_selections" (
  "id" text not null primary key,
  "participant_id" text not null
    references "participants" ("id") on delete restrict,
  "course_id" text not null,
  "module_id" text not null,
  "group_id" text not null,
  unique ("participant_id", "module_id"),
  foreign key ("module_id", "course_id")
    references "modules" ("id", "course_id") on delete restrict,
  foreign key ("group_id", "course_id")
    references "groups" ("id", "course_id") on delete restrict
);

create trigger "module_selections_participant_ownership_is_permanent"
before update of "participant_id" on "module_selections"
when old."participant_id" <> new."participant_id"
begin
  select raise(abort, 'Module Selection Participant ownership is permanent');
end;

create trigger "module_selections_course_ownership_is_permanent"
before update of "course_id" on "module_selections"
when old."course_id" <> new."course_id"
begin
  select raise(abort, 'Module Selection Course ownership is permanent');
end;

create trigger "module_selections_module_ownership_is_permanent"
before update of "module_id" on "module_selections"
when old."module_id" <> new."module_id"
begin
  select raise(abort, 'Module Selection Module ownership is permanent');
end;
