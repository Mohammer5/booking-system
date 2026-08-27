alter table "courses"
  add column "has_ever_had_module" integer not null default 0
  check ("has_ever_had_module" in (0, 1));

create trigger "courses_module_history_is_permanent"
before update of "has_ever_had_module" on "courses"
when old."has_ever_had_module" = 1 and new."has_ever_had_module" <> 1
begin
  select raise(abort, 'Course Module history is permanent');
end;

create table "groups" (
  "id" text not null primary key,
  "course_id" text not null
    references "courses" ("id") on delete restrict,
  "name" text not null check (length(trim("name")) > 0),
  "normalized_name" text not null check (length("normalized_name") > 0),
  "details" text,
  "state" text not null check ("state" in ('active', 'archived'))
);

create unique index "groups_active_course_normalized_name_uidx"
  on "groups" ("course_id", "normalized_name")
  where "state" = 'active';

create trigger "groups_course_ownership_is_permanent"
before update of "course_id" on "groups"
when old."course_id" <> new."course_id"
begin
  select raise(abort, 'Group Course ownership is permanent');
end;

create table "modules" (
  "id" text not null primary key,
  "course_id" text not null
    references "courses" ("id") on delete restrict,
  "title" text not null check (length(trim("title")) > 0),
  "description" text,
  "instructions" text,
  "starts_at" integer not null,
  "ends_at" integer not null check ("ends_at" > "starts_at"),
  "state" text not null check ("state" in ('scheduled', 'cancelled'))
);

create trigger "modules_course_ownership_is_permanent"
before update of "course_id" on "modules"
when old."course_id" <> new."course_id"
begin
  select raise(abort, 'Module Course ownership is permanent');
end;

create trigger "modules_record_course_schedule_history"
after insert on "modules"
begin
  update "courses"
     set "has_ever_had_module" = 1
   where "id" = new."course_id";
end;
