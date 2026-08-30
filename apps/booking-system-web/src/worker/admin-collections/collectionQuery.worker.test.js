import { describe, expect, it } from "vitest";

import {
  adminCollectionConfigurations,
  literalLikePattern,
  parseAdminCollectionQuery,
} from "./index.js";

describe("Admin collection query parsing", () => {
  it.each([
    ["courses", "name", "asc"],
    ["participants", "name", "asc"],
    ["adminUsers", "name", "asc"],
    ["invites", "createdAt", "desc"],
    ["assignments", "name", "asc"],
    ["groups", "name", "asc"],
    ["modules", "startsAt", "asc"],
  ])("normalizes %s defaults", (resource, field, direction) => {
    expect(parse(resource, "")).toEqual({
      outcome: "valid",
      query: {
        page: 1,
        pageSize: 25,
        sortField: field,
        sortDirection: direction,
        q: resource === "invites" ? undefined : undefined,
        filters: expect.any(Object),
      },
    });
  });

  it.each([10, 25, 50])("accepts page size %s", (pageSize) => {
    expect(parse("courses", `page=3&pageSize=${pageSize}`)).toMatchObject({
      outcome: "valid",
      query: { page: 3, pageSize },
    });
  });

  it.each([
    ["courses", "state=archived", { state: "archived" }],
    ["participants", "state=disabled", { state: "disabled" }],
    ["adminUsers", "state=active&authority=super-admin", {
      state: "active",
      authority: "super-admin",
    }],
    ["invites", "state=claimed", { state: "claimed" }],
    ["assignments", "participantState=disabled&assignmentState=revoked", {
      participantState: "disabled",
      assignmentState: "revoked",
    }],
    ["groups", "state=archived", { state: "archived" }],
    ["modules", "state=cancelled", { state: "cancelled" }],
  ])("accepts %s allowlisted filters", (resource, query, filters) => {
    expect(parse(resource, query)).toMatchObject({
      outcome: "valid",
      query: { filters },
    });
  });

  it.each(Object.entries(adminCollectionConfigurations).flatMap(
    ([resource, configuration]) => configuration.sortFields.flatMap(
      (field) => ["asc", "desc"].map((direction) => [
        resource,
        `${field}.${direction}`,
        field,
        direction,
      ]),
    ),
  ))("accepts %s sort %s", (resource, sort, field, direction) => {
    expect(parse(resource, `sort=${sort}`)).toMatchObject({
      outcome: "valid",
      query: { sortField: field, sortDirection: direction },
    });
  });

  it("trims search without interpreting literal wildcard characters", () => {
    expect(parse("courses", "q=%20%25_under%5Cscore%20")).toMatchObject({
      query: { q: "%_under\\score" },
    });
    expect(literalLikePattern("%_under\\score")).toBe(
      "%\\%\\_under\\\\score%",
    );
  });

  it.each([
    "page=0",
    "page=-1",
    "page=1.5",
    "pageSize=20",
    "sort=name.sideways",
    "sort=unknown.asc",
    "state=unknown",
    "page=1&page=2",
    "unknown=value",
  ])("rejects malformed input %s", (query) => {
    expect(parse("courses", query)).toEqual({
      outcome: "invalid-list-query",
    });
  });

  it("rejects search on the non-searchable Invite collection", () => {
    expect(parse("invites", "q=secret")).toEqual({
      outcome: "invalid-list-query",
    });
  });
});

/** @returns {object} Parsed result for one resource and query string. */
function parse(resource, query) {
  return parseAdminCollectionQuery(
    new URLSearchParams(query),
    adminCollectionConfigurations[resource],
  );
}
