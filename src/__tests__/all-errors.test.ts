// @ts-ignore TS6133
import { expect, test } from "@jest/globals";

import { util } from "../helpers/util";
import * as z from "../index";

const Test = z.object({
  f1: z.number(),
  f2: z.string().optional(),
  f3: z.string().nullable(),
  f4: z.array(z.object({ t: z.union([z.string(), z.boolean()]) })),
});
type TestFlattenedErrors = z.inferFlattenedErrors<
  typeof Test,
  { message: string; code: number }
>;
type TestFormErrors = z.inferFlattenedErrors<typeof Test>;

test("default flattened errors type inference", () => {
  type TestTypeErrors = {
    formErrors: string[];
    fieldErrors: { [P in keyof z.TypeOf<typeof Test>]?: string[] | undefined };
  };

  const t1: util.AssertEqual<
    z.inferFlattenedErrors<typeof Test>,
    TestTypeErrors
  > = true;
  const t2: util.AssertEqual<
    z.inferFlattenedErrors<typeof Test, { message: string }>,
    TestTypeErrors
  > = false;
  [t1, t2];
});

test("custom flattened errors type inference", () => {
  type ErrorType = { message: string; code: number };
  type TestTypeErrors = {
    formErrors: ErrorType[];
    fieldErrors: {
      [P in keyof z.TypeOf<typeof Test>]?: ErrorType[] | undefined;
    };
  };

  const t1: util.AssertEqual<
    z.inferFlattenedErrors<typeof Test>,
    TestTypeErrors
  > = false;
  const t2: util.AssertEqual<
    z.inferFlattenedErrors<typeof Test, { message: string; code: number }>,
    TestTypeErrors
  > = true;
  const t3: util.AssertEqual<
    z.inferFlattenedErrors<typeof Test, { message: string }>,
    TestTypeErrors
  > = false;
  [t1, t2, t3];
});

test("form errors type inference", () => {
  type TestTypeErrors = {
    formErrors: string[];
    fieldErrors: { [P in keyof z.TypeOf<typeof Test>]?: string[] | undefined };
  };

  const t1: util.AssertEqual<
    z.inferFlattenedErrors<typeof Test>,
    TestTypeErrors
  > = true;
  [t1];
});

test(".flatten() type assertion", () => {
  const parsed = Test.safeParse({}) as z.SafeParseError<void>;
  const validFlattenedErrors: TestFlattenedErrors = parsed.error.flatten(
    () => ({ message: "", code: 0 })
  );
  // @ts-expect-error should fail assertion between `TestFlattenedErrors` and unmapped `flatten()`.
  const invalidFlattenedErrors: TestFlattenedErrors = parsed.error.flatten();
  const validFormErrors: TestFormErrors = parsed.error.flatten();
  // @ts-expect-error should fail assertion between `TestFormErrors` and mapped `flatten()`.
  const invalidFormErrors: TestFormErrors = parsed.error.flatten(() => ({
    message: "string",
    code: 0,
  }));

  [
    validFlattenedErrors,
    invalidFlattenedErrors,
    validFormErrors,
    invalidFormErrors,
  ];
});

test(".formErrors type assertion", () => {
  const parsed = Test.safeParse({}) as z.SafeParseError<void>;
  const validFormErrors: TestFormErrors = parsed.error.formErrors;
  // @ts-expect-error should fail assertion between `TestFlattenedErrors` and `.formErrors`.
  const invalidFlattenedErrors: TestFlattenedErrors = parsed.error.formErrors;

  [validFormErrors, invalidFlattenedErrors];
});

test("all errors", () => {
  const propertySchema = z.string();
  const schema = z
    .object({
      a: propertySchema,
      b: propertySchema,
    })
    .refine(
      (val) => {
        return val.a === val.b;
      },
      { message: "Must be equal" }
    );

  try {
    schema.parse({
      a: "asdf",
      b: "qwer",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      expect(error.flatten()).toEqual({
        formErrors: ["Must be equal"],
        fieldErrors: {},
      });
    }
  }

  try {
    schema.parse({
      a: null,
      b: null,
    });
  } catch (_error) {
    const error = _error as z.ZodError;
    expect(error.flatten()).toEqual({
      formErrors: [],
      fieldErrors: {
        a: ["Expected string, received null"],
        b: ["Expected string, received null"],
      },
    });

    expect(error.flatten((iss) => iss.message.toUpperCase())).toEqual({
      formErrors: [],
      fieldErrors: {
        a: ["EXPECTED STRING, RECEIVED NULL"],
        b: ["EXPECTED STRING, RECEIVED NULL"],
      },
    });
    // Test identity

    expect(error.flatten((i: z.ZodIssue) => i)).toEqual({
      formErrors: [],
      fieldErrors: {
        a: [
          {
            code: "invalid_type",
            expected: "string",
            message: "Expected string, received null",
            path: ["a"],
            received: "null",
          },
        ],
        b: [
          {
            code: "invalid_type",
            expected: "string",
            message: "Expected string, received null",
            path: ["b"],
            received: "null",
          },
        ],
      },
    });
    // Test mapping
    expect(error.flatten((i: z.ZodIssue) => i.message.length)).toEqual({
      formErrors: [],
      fieldErrors: {
        a: ["Expected string, received null".length],
        b: ["Expected string, received null".length],
      },
    });
  }
});
