import { describe, expect, it } from "vitest";
import { usePortsStore } from "./portsStore";

describe("portsStore", () => {
  it("initializes with empty lists and closed drawer", () => {
    const state = usePortsStore.getState();
    expect(state.ports).toEqual([]);
    expect(state.tunnels).toEqual([]);
    expect(state.isOpen).toBe(false);
  });

  it("toggles drawer open state", () => {
    usePortsStore.getState().setOpen(true);
    expect(usePortsStore.getState().isOpen).toBe(true);

    usePortsStore.getState().setOpen(false);
    expect(usePortsStore.getState().isOpen).toBe(false);
  });
});
