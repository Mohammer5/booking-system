import { describe, expect, it } from "vitest";

import {
  changeAdminCollectionState,
  createAdminCollectionConfiguration,
  normalizeAdminCollectionSearch,
  resetAdminCollectionFilters,
} from "./collectionState.js";

const configuration = createAdminCollectionConfiguration({
  searchable: true,
  filters: { state: ["active", "archived"] },
  sortFields: ["name", "state", "timezone"],
  defaultSort: "name.asc",
});

describe("Admin collection browser state", () => {
  it("produces deterministic defaults and an empty canonical URL", () => {
    const result = normalizeAdminCollectionSearch(
      new URLSearchParams(),
      configuration,
    );

    expect(result.state).toEqual({
      page: 1,
      pageSize: 25,
      sortField: "name",
      sortDirection: "asc",
      q: undefined,
      filters: { state: undefined },
    });
    expect(result.searchParams.toString()).toBe("");
    expect(result.needsRepair).toBe(false);
  });

  it("normalizes valid bookmark state into canonical parameter order", () => {
    const result = normalizeAdminCollectionSearch(
      new URLSearchParams(
        "page=2&sort=timezone.desc&q=%20Berlin%20&pageSize=10&state=archived",
      ),
      configuration,
    );

    expect(result.state).toMatchObject({
      page: 2,
      pageSize: 10,
      sortField: "timezone",
      sortDirection: "desc",
      q: "Berlin",
      filters: { state: "archived" },
    });
    expect(result.searchParams.toString()).toBe(
      "q=Berlin&state=archived&sort=timezone.desc&pageSize=10&page=2",
    );
    expect(result.needsRepair).toBe(true);
  });

  it("repairs invalid, repeated, and unknown state without forwarding it", () => {
    const result = normalizeAdminCollectionSearch(
      new URLSearchParams(
        "page=0&pageSize=20&sort=private.asc&state=deleted&q=a&q=b&secret=x",
      ),
      configuration,
    );

    expect(result.state).toEqual({
      page: 1,
      pageSize: 25,
      sortField: "name",
      sortDirection: "asc",
      q: undefined,
      filters: { state: undefined },
    });
    expect(result.searchParams.toString()).toBe("");
    expect(result.needsRepair).toBe(true);
  });

  it.each([10, 25, 50])("retains allowed page size %s", (pageSize) => {
    const result = normalizeAdminCollectionSearch(
      new URLSearchParams(`pageSize=${pageSize}`),
      configuration,
    );

    expect(result.state.pageSize).toBe(pageSize);
  });

  it("resets page for applied-state changes and preserves it for page-only changes", () => {
    const state = normalizeAdminCollectionSearch(
      new URLSearchParams("page=4&pageSize=10&sort=state.desc&q=one"),
      configuration,
    ).state;

    expect(changeAdminCollectionState(state, { page: 3 }).page).toBe(3);
    expect(changeAdminCollectionState(state, { q: "two" })).toMatchObject({
      page: 1,
      pageSize: 10,
      sortField: "state",
      sortDirection: "desc",
      q: "two",
    });
    expect(changeAdminCollectionState(state, {
      filters: { state: "archived" },
    })).toMatchObject({ page: 1, filters: { state: "archived" } });
  });

  it("clears search and filters while retaining sort and page size", () => {
    const state = normalizeAdminCollectionSearch(
      new URLSearchParams(
        "page=4&pageSize=50&sort=timezone.desc&q=Berlin&state=archived",
      ),
      configuration,
    ).state;

    expect(resetAdminCollectionFilters(state)).toEqual({
      page: 1,
      pageSize: 50,
      sortField: "timezone",
      sortDirection: "desc",
      q: undefined,
      filters: { state: undefined },
    });
  });
});
