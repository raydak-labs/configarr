import { describe, expect, it } from "vitest";
import { DiffEntry } from "./diffReport.types";
import { redactDiffEntry } from "./redactSecrets";

const HOOKS_URL = "https://hooks.example.com/services/T0KEN-PATH?token=Q-SECRET";
const USERINFO_URL = "https://user:P4SS@host.example.com/x";

interface ShapeDef {
  shapeId: number;
  name: string;
  createValue: (url: string) => unknown;
}

const shapes1to8: ShapeDef[] = [
  { shapeId: 1, name: "plain string URL", createValue: (url) => url },
  { shapeId: 2, name: "object { url }", createValue: (url) => ({ url }) },
  { shapeId: 3, name: "object with non-URL key { target }", createValue: (url) => ({ target: url }) },
  { shapeId: 4, name: "array of shape 2 [{ url }]", createValue: (url) => [{ url }] },
  { shapeId: 5, name: "array of plain URL strings", createValue: (url) => [url] },
  {
    shapeId: 6,
    name: "name/value pair array (name: url)",
    createValue: (url) => [{ name: "url", value: url }],
  },
  {
    shapeId: 6,
    name: "name/value pair array (name: webhookUrl)",
    createValue: (url) => [{ name: "webhookUrl", value: url }],
  },
  {
    shapeId: 7,
    name: "deep nesting { a: { b: [ { c: { url } } ] } }",
    createValue: (url) => ({ a: { b: [{ c: { url } }] } }),
  },
  {
    shapeId: 7,
    name: "deep nesting with non-URL key { a: { b: [ { c: { target } } ] } }",
    createValue: (url) => ({ a: { b: [{ c: { target: url } }] } }),
  },
  {
    shapeId: 8,
    name: "JSON string containing URL",
    createValue: (url) => JSON.stringify({ url }),
  },
];

const shape9Primitives: Array<{ name: string; value: unknown }> = [
  { name: "number (42)", value: 42 },
  { name: "boolean (true)", value: true },
  { name: "null", value: null },
  { name: "undefined", value: undefined },
];

interface TestRow {
  shapeId: number;
  shapeName: string;
  resourceType: "Notification" | "DownloadClient";
  field: string;
  side: "from" | "to";
  value: unknown;
  isShape9: boolean;
  expectedPrimitive?: unknown;
}

const testRows: TestRow[] = [];

// Shapes 1 to 8 across Notification (hooks URL & userinfo URL) and DownloadClient (userinfo URL)
const contexts = [
  { resourceType: "Notification" as const, field: "fields.url", url: HOOKS_URL },
  { resourceType: "Notification" as const, field: "fields.url", url: USERINFO_URL },
  { resourceType: "DownloadClient" as const, field: "fields.host", url: USERINFO_URL },
];

for (const ctx of contexts) {
  for (const shape of shapes1to8) {
    for (const side of ["from", "to"] as const) {
      testRows.push({
        shapeId: shape.shapeId,
        shapeName: `${shape.name} (${ctx.url.includes("hooks") ? "hooks URL" : "userinfo URL"})`,
        resourceType: ctx.resourceType,
        field: ctx.field,
        side,
        value: shape.createValue(ctx.url),
        isShape9: false,
      });
    }
  }
}

// Shape 9 primitives across Notification and DownloadClient
const shape9Contexts = [
  { resourceType: "Notification" as const, field: "fields.url" },
  { resourceType: "DownloadClient" as const, field: "fields.host" },
];

for (const ctx of shape9Contexts) {
  for (const primitive of shape9Primitives) {
    for (const side of ["from", "to"] as const) {
      testRows.push({
        shapeId: 9,
        shapeName: `primitive ${primitive.name}`,
        resourceType: ctx.resourceType,
        field: ctx.field,
        side,
        value: primitive.value,
        isShape9: true,
        expectedPrimitive: primitive.value,
      });
    }
  }
}

// Also test non-notification plain URL without credentials (stays unredacted)
for (const side of ["from", "to"] as const) {
  testRows.push({
    shapeId: 1,
    shapeName: "plain URL without credentials (unredacted)",
    resourceType: "DownloadClient",
    field: "fields.host",
    side,
    value: "https://host.example.com/safe/path",
    isShape9: false,
  });
}

describe("redactDiffEntry class table", () => {
  it.each(testRows)(
    "shape $shapeId: $shapeName ($side) on $resourceType ($field)",
    ({ resourceType, field, side, value, isShape9, expectedPrimitive }) => {
      const fallbackValue = isShape9 ? null : undefined;
      const entry: DiffEntry = {
        resourceType,
        name: "test-resource",
        action: "update",
        fieldChanges: [
          {
            field,
            from: side === "from" ? value : fallbackValue,
            to: side === "to" ? value : fallbackValue,
          },
        ],
      };

      const clonedInput = structuredClone(entry);
      const result = redactDiffEntry(entry);

      // Assert no mutation of the input object
      expect(entry).toEqual(clonedInput);

      // Assert serialized output contains none of the planted secret material
      const json = JSON.stringify(result);
      expect(json).not.toContain("T0KEN-PATH");
      expect(json).not.toContain("Q-SECRET");
      expect(json).not.toContain("P4SS");

      // For shape 9: assert the primitive passes through unchanged
      if (isShape9) {
        const actualValue = result.fieldChanges?.[0]?.[side];
        expect(actualValue).toBe(expectedPrimitive);
      }
    },
  );
});
