// Regression tests for server-side auth handling (run with `npm test`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { getBearerToken } from "../lib/auth-token.ts";

const withAuth = (value) =>
  new Request("http://localhost/api/test", {
    method: "POST",
    headers: value === undefined ? {} : { Authorization: value },
  });

test("extracts the token from a Bearer header", () => {
  assert.equal(getBearerToken(withAuth("Bearer abc.def.ghi")), "abc.def.ghi");
  assert.equal(getBearerToken(withAuth("bearer abc.def.ghi")), "abc.def.ghi");
});

test("rejects missing, malformed and junk tokens", () => {
  assert.equal(getBearerToken(withAuth(undefined)), undefined);
  assert.equal(getBearerToken(withAuth("")), undefined);
  assert.equal(getBearerToken(withAuth("abc.def.ghi")), undefined); // no scheme
  assert.equal(getBearerToken(withAuth("Bearer ")), undefined);
  // What the old video upload sent when it found no stored session
  assert.equal(getBearerToken(withAuth("Bearer null")), undefined);
  assert.equal(getBearerToken(withAuth("Bearer undefined")), undefined);
  // The old video route forwarded the whole header, producing a double prefix
  assert.equal(getBearerToken(withAuth("Bearer Bearer abc")), undefined);
});

test("no application code uses the Supabase service-role key", () => {
  // Server routes must act as the signed-in user so Row Level Security applies.
  const root = join(import.meta.dirname, "..");
  const sourceDirs = ["app", "lib", "components", "hooks"];
  const offenders = [];

  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
        const source = readFileSync(path, "utf8");
        if (/SUPABASE_SERVICE_ROLE_KEY|createSupabaseAdminClient/.test(source)) {
          offenders.push(relative(root, path));
        }
      }
    }
  };
  for (const dir of sourceDirs) walk(join(root, dir));

  assert.deepEqual(offenders, [], `service-role usage found in: ${offenders.join(", ")}`);
});
