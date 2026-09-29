import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { setLastWslDistro } from "@/modules/settings/store";
import type { SshConfig } from "./ssh";
import { getSavedSshProfiles } from "./ssh";

export type SshWorkspaceEnv = {
  kind: "ssh";
  id: string;
  label: string;
  host: string;
  user?: string;
  port?: number;
  key_path?: string;
  remote_path: string;
};

export type DevContainerWorkspaceEnv = {
  kind: "devcontainer";
  container_id: string;
  name: string;
  remote_path: string;
};

export type WorkspaceEnv =
  | { kind: "local" }
  | { kind: "wsl"; distro: string }
  | SshWorkspaceEnv
  | DevContainerWorkspaceEnv;

export type WslDistro = {
  name: string;
  default: boolean;
  running: boolean;
};

type State = {
  env: WorkspaceEnv;
  distros: WslDistro[];
  sshProfiles: SshConfig[];
  loading: boolean;
  error: string | null;
  setEnv: (env: WorkspaceEnv) => void;
  refreshDistros: () => Promise<WslDistro[]>;
  refreshSshProfiles: () => void;
};

export const LOCAL_WORKSPACE: WorkspaceEnv = { kind: "local" };

export const useWorkspaceEnvStore = create<State>((set) => ({
  env: LOCAL_WORKSPACE,
  distros: [],
  sshProfiles: getSavedSshProfiles(),
  loading: false,
  error: null,
  setEnv: (env) => {
    set({ env });
    if (env.kind === "wsl") void setLastWslDistro(env.distro);
  },
  refreshDistros: async () => {
    set({ loading: true, error: null });
    try {
      const distros = await invoke<WslDistro[]>("wsl_list_distros");
      set({ distros, loading: false });
      return distros;
    } catch (e) {
      set({ distros: [], loading: false, error: String(e) });
      return [];
    }
  },
  refreshSshProfiles: () => {
    set({ sshProfiles: getSavedSshProfiles() });
  },
}));

export function currentWorkspaceEnv(): WorkspaceEnv {
  return useWorkspaceEnvStore.getState().env;
}

export function workspaceScopeKey(env: WorkspaceEnv): string {
  if (env.kind === "wsl") return `wsl:${env.distro}`;
  if (env.kind === "ssh") return `ssh:${env.id}`;
  if (env.kind === "devcontainer") return `devcontainer:${env.container_id}`;
  return "local";
}

export function parseWorkspaceScopeKey(key: string): WorkspaceEnv {
  if (key.startsWith("wsl:")) {
    return { kind: "wsl", distro: key.slice("wsl:".length) };
  }
  return LOCAL_WORKSPACE;
}

export function currentWorkspaceScopeKey(): string {
  return workspaceScopeKey(currentWorkspaceEnv());
}

export async function getWslHome(distro: string): Promise<string> {
  return invoke<string>("wsl_home", { distro });
}
