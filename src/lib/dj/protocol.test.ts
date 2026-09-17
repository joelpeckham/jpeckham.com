import { describe, expect, it } from "vitest";
import {
  emptyState,
  emptyTransport,
  mergeCatalog,
  mergeLive,
  mergeParts,
  parseDjLive,
  parseWireMessage,
  type DjCatalog,
  type DjLive,
  type DjState,
} from "./protocol";

function live(overrides: Partial<DjLive> = {}): DjLive {
  return {
    version: 1,
    catalogVersion: 1,
    daemonOnline: true,
    transport: emptyTransport(),
    nowPlaying: null,
    pending: null,
    ...overrides,
  };
}

function catalog(overrides: Partial<DjCatalog> = {}): DjCatalog {
  return {
    catalogVersion: 1,
    vibes: [
      {
        id: "vibe-1",
        name: "Combat",
        hue: "blood",
        shuffle: true,
        tracks: [{ id: "trk-1", title: "War", artist: "X" }],
      },
    ],
    characters: [],
    ...overrides,
  };
}

describe("mergeLive", () => {
  it("rejects equal and older versions for transport", () => {
    const state = emptyState({
      version: 5,
      catalogVersion: 3,
      transport: { ...emptyTransport(), vibeId: "a" },
    });
    const older = mergeLive(state, live({ version: 4, catalogVersion: 3, daemonOnline: false }));
    expect(older.version).toBe(5);
    expect(older.transport.vibeId).toBe("a");
    const same = mergeLive(state, live({ version: 5, catalogVersion: 3, daemonOnline: false }));
    expect(same.transport.vibeId).toBe("a");
    expect(same.daemonOnline).toBe(false);
  });

  it("never decreases catalogVersion", () => {
    const state = emptyState({
      version: 10,
      catalogVersion: 5,
      vibes: catalog({ catalogVersion: 5 }).vibes,
    });
    const merged = mergeLive(
      state,
      live({ version: 11, catalogVersion: 3, daemonOnline: true }),
    );
    expect(merged.version).toBe(11);
    expect(merged.catalogVersion).toBe(5);
    expect(merged.vibes).toHaveLength(1);
  });

  it("raises catalogVersion from a lower-version live without taking transport", () => {
    const state = emptyState({
      version: 8,
      catalogVersion: 2,
      transport: { ...emptyTransport(), vibeId: "keep" },
    });
    const merged = mergeLive(
      state,
      live({
        version: 7,
        catalogVersion: 4,
        transport: { ...emptyTransport(), vibeId: "drop" },
      }),
    );
    expect(merged.version).toBe(8);
    expect(merged.catalogVersion).toBe(4);
    expect(merged.transport.vibeId).toBe("keep");
  });
});

describe("mergeCatalog", () => {
  it("rejects equal and older catalogs", () => {
    const state = emptyState({
      catalogVersion: 4,
      vibes: catalog().vibes,
    });
    expect(mergeCatalog(state, catalog({ catalogVersion: 4 })).catalogVersion).toBe(4);
    expect(mergeCatalog(state, catalog({ catalogVersion: 3 })).vibes).toHaveLength(1);
  });

  it("applies a newer catalog", () => {
    const state = emptyState({ catalogVersion: 1 });
    const next = mergeCatalog(state, catalog({ catalogVersion: 2 }));
    expect(next.catalogVersion).toBe(2);
    expect(next.vibes[0]?.name).toBe("Combat");
  });
});

describe("mergeParts", () => {
  it("uses the max catalogVersion", () => {
    const state = mergeParts(catalog({ catalogVersion: 10 }), live({ catalogVersion: 8 }), true);
    expect(state.catalogVersion).toBe(10);
    expect(state.vibes).toHaveLength(1);
  });
});

describe("parseWireMessage", () => {
  it("rejects garbage live and catalog payloads", () => {
    expect(parseWireMessage(JSON.stringify({ type: "live", live: { version: "nope" } }))).toBeNull();
    expect(parseWireMessage(JSON.stringify({ type: "catalog", catalog: { vibes: [] } }))).toBeNull();
    expect(parseWireMessage(JSON.stringify({ type: "snapshot", snapshot: { foo: 1 } }))).toBeNull();
  });

  it("accepts a well-formed live frame", () => {
    const parsed = parseWireMessage(
      JSON.stringify({
        type: "live",
        live: live({ version: 2, catalogVersion: 1 }),
      }),
    );
    expect(parsed?.type).toBe("live");
    if (parsed?.type === "live") {
      expect(parsed.live.version).toBe(2);
    }
  });

  it("still parses hello and commands", () => {
    expect(
      parseWireMessage(JSON.stringify({ type: "hello", role: "remote", secret: "pin" })),
    ).toEqual({ type: "hello", role: "remote", secret: "pin" });
    expect(
      parseWireMessage(
        JSON.stringify({ type: "command", id: "1", name: "pause", payload: {} }),
      ),
    ).toMatchObject({ type: "command", name: "pause" });
  });
});

describe("parseDjLive", () => {
  it("drops a live object without transport", () => {
    expect(parseDjLive({ version: 1, catalogVersion: 1, daemonOnline: true })).toBeNull();
  });
});

describe("empty state shape", () => {
  it("can round-trip through mergeLive", () => {
    const state: DjState = emptyState({ version: 1 });
    const next = mergeLive(state, live({ version: 2, lastError: "skip" }));
    expect(next.lastError).toBe("skip");
    expect(next.version).toBe(2);
  });
});
