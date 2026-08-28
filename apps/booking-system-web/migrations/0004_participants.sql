create table "participants" (
  "id" text not null primary key,
  "external_principal_id" text not null unique,
  "name" text not null check (length(trim("name")) > 0),
  "email" text not null
    check (length("email") > 0 and "email" = trim("email")),
  "normalized_email" text not null unique
    check (
      length("normalized_email") > 0
      and "normalized_email" = lower("normalized_email")
    ),
  "state" text not null check ("state" in ('active', 'disabled'))
);
