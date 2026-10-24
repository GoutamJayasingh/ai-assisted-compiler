import { ApiError, api } from "../../src/services/api";

afterEach(() => vi.restoreAllMocks());

describe("api client", () => {
  it("maps a network failure to BACKEND_UNAVAILABLE with a start hint", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.lex("int x;")).rejects.toMatchObject({ code: "BACKEND_UNAVAILABLE" });
    try {
      await api.lex("int x;");
    } catch (e) {
      expect((e as ApiError).hint).toContain("uvicorn");
    }
  });
  it("surfaces structured backend errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "COMPILER_UNAVAILABLE", message: "not built", hint: "cmake" } }), { status: 503 }),
    );
    await expect(api.repair("x", { strategy: "parallax", grouping: true, stability: true, abstention: true, layout: true })).rejects.toMatchObject({
      code: "COMPILER_UNAVAILABLE",
      status: 503,
      hint: "cmake",
    });
  });
  it("rejects non-JSON responses as BACKEND_FAILURE", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>", { status: 502 }));
    await expect(api.lex("x")).rejects.toMatchObject({ code: "BACKEND_FAILURE" });
  });
  it("reports cancellation as ABORTED", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_u, init) =>
      new Promise((_res, rej) => (init as RequestInit).signal!.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")))),
    );
    const ctrl = new AbortController();
    const p = api.lex("x", ctrl.signal);
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ code: "ABORTED" });
  });
  it("only sends tau when it is set", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    await api.repair("x", { strategy: "parallax", grouping: false, stability: true, abstention: true, layout: true, tau: null });
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.options).toEqual({ strategy: "parallax", grouping: false, stability: true, abstention: true, layout: true });
  });
});
