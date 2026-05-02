import assert from "node:assert/strict";

type QueryFilter =
  | { type: "eq"; column: string; value: unknown }
  | { type: "in"; column: string; value: unknown[] }
  | { type: "lt"; column: string; value: unknown };

export type QueryState = {
  table: string;
  action: "select" | "insert" | "upsert" | "update" | "delete" | null;
  selectColumns?: string;
  payload?: unknown;
  filters: QueryFilter[];
  expect?: "single" | "maybeSingle";
  orderBy?: { column: string; ascending: boolean };
};

type SupabaseResolver = (state: QueryState) => {
  data?: unknown;
  error?: unknown;
};

export function createMockReq(overrides: Record<string, unknown> = {}) {
  return {
    method: "GET",
    body: undefined,
    query: {},
    ...overrides,
  };
}

export function createMockRes() {
  const headers = new Map<string, string>();

  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers,
    setHeader(name: string, value: string) {
      headers.set(name, value);
      return response;
    },
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response;
    },
  };

  return response;
}

export function createSupabaseMock(resolver: SupabaseResolver) {
  const calls: QueryState[] = [];

  function from(table: string) {
    const state: QueryState = {
      table,
      action: null,
      filters: [],
    };

    const builder = {
      select(columns: string) {
        state.action = "select";
        state.selectColumns = columns;
        return builder;
      },
      insert(payload: unknown) {
        state.action = "insert";
        state.payload = payload;
        return builder;
      },
      upsert(payload: unknown) {
        state.action = "upsert";
        state.payload = payload;
        return builder;
      },
      update(payload: unknown) {
        state.action = "update";
        state.payload = payload;
        return builder;
      },
      delete() {
        state.action = "delete";
        return builder;
      },
      eq(column: string, value: unknown) {
        state.filters.push({ type: "eq", column, value });
        return builder;
      },
      in(column: string, value: unknown[]) {
        state.filters.push({ type: "in", column, value });
        return builder;
      },
      lt(column: string, value: unknown) {
        state.filters.push({ type: "lt", column, value });
        return builder;
      },
      order(column: string, options?: { ascending?: boolean }) {
        state.orderBy = {
          column,
          ascending: options?.ascending ?? true,
        };
        return builder;
      },
      single() {
        state.expect = "single";
        calls.push(structuredClone(state));
        return Promise.resolve(resolver(state));
      },
      maybeSingle() {
        state.expect = "maybeSingle";
        calls.push(structuredClone(state));
        return Promise.resolve(resolver(state));
      },
      then(
        onfulfilled?: (value: unknown) => unknown,
        onrejected?: (reason: unknown) => unknown,
      ) {
        calls.push(structuredClone(state));
        return Promise.resolve(resolver(state)).then(onfulfilled, onrejected);
      },
    };

    return builder;
  }

  return {
    client: { from },
    calls,
  };
}

export function expectQuery(
  calls: QueryState[],
  matcher: (state: QueryState) => boolean,
) {
  const match = calls.find(matcher);
  assert.ok(match, "Expected query call was not recorded");
  return match;
}
