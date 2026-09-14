import { describe, it, expect } from "vitest";
import { readJsonResponse } from "./fetch-json";

const res = (body: string, init: ResponseInit = {}) => new Response(body, init);

describe("readJsonResponse", () => {
  it("returns the parsed body on a normal JSON reply", async () => {
    await expect(readJsonResponse(res('{"hooks":[1]}'))).resolves.toEqual({ hooks: [1] });
  });

  it("names a timeout instead of leaking a parser error", async () => {
    // What the builder actually hit: a platform error page, not JSON.
    await expect(readJsonResponse(res("An error occurred with this application", { status: 504 }), "hook spread")).rejects.toThrow(
      /took too long/,
    );
  });

  it("names the status when the body is not JSON and the call failed", async () => {
    await expect(readJsonResponse(res("<html>oops</html>", { status: 500 }), "hook spread")).rejects.toThrow(/returned 500/);
  });

  it("never surfaces the raw JSON.parse message", async () => {
    await expect(readJsonResponse(res("An error occurred", { status: 500 }))).rejects.toThrow(/^(?!.*is not valid JSON).*$/);
  });

  it("explains a 200 that is somehow not JSON", async () => {
    await expect(readJsonResponse(res("ok"), "hook spread")).rejects.toThrow(/could not read/);
  });
});
