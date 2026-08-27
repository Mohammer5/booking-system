create table "courses" (
  "id" text not null primary key,
  "name" text not null check (length(trim("name")) > 0),
  "description" text,
  "timezone" text not null check (length(trim("timezone")) > 0),
  "state" text not null check ("state" in ('active', 'archived'))
);
