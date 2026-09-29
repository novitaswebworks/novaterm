import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { currentWorkspaceEnv } from "@/modules/workspace";
import type { ActiveTunnel, ListeningPort } from "./types";

type PortsState = {
  ports: ListeningPort[];
  tunnels: ActiveTunnel[];
  loading: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  fetchPorts: () => Promise<void>;
  startForward: (
    remotePort: number,
    localPort: number,
    host: string,
    user?: string,
    port?: number,
    keyPath?: string
  ) => Promise<number>;
  stopForward: (id: number) => Promise<void>;
};

export const usePortsStore = create<PortsState>((set, get) => ({
  ports: [],
  tunnels: [],
  loading: false,
  isOpen: false,
  setOpen: (isOpen) => {
    set({ isOpen });
    if (isOpen) {
      void get().fetchPorts();
    }
  },
  fetchPorts: async () => {
    set({ loading: true });
    try {
      const workspace = currentWorkspaceEnv();
      const [ports, tunnels] = await Promise.all([
        invoke<ListeningPort[]>("ports_list", { workspace }),
        invoke<ActiveTunnel[]>("port_forward_list_active"),
      ]);
      set({ ports, tunnels, loading: false });
    } catch (_e) {
      set({ ports: [], tunnels: [], loading: false });
    }
  },
  startForward: async (
    remotePort,
    localPort,
    host,
    user,
    port,
    keyPath
  ) => {
    const id = await invoke<number>("port_forward_start", {
      remotePort,
      localPort,
      host,
      user: user || null,
      port: port || null,
      keyPath: keyPath || null,
    });
    await get().fetchPorts();
    return id;
  },
  stopForward: async (id) => {
    await invoke("port_forward_stop", { id });
    await get().fetchPorts();
  },
}));
