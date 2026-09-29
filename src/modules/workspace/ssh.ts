import { invoke } from "@tauri-apps/api/core";

export type SshConfig = {
  id: string;
  label: string;
  host: string;
  user?: string;
  port?: number;
  key_path?: string;
  remote_path?: string;
};

const STORAGE_KEY = "novaterm:ssh_profiles";

export async function testSshConnection(
  host: string,
  user?: string,
  port?: number,
  keyPath?: string
): Promise<string> {
  return invoke<string>("ssh_test_connection", {
    host,
    user: user || null,
    port: port || null,
    keyPath: keyPath || null,
  });
}

export async function getRemoteSshHome(
  host: string,
  user?: string,
  port?: number,
  keyPath?: string
): Promise<string> {
  return invoke<string>("ssh_get_remote_home", {
    host,
    user: user || null,
    port: port || null,
    keyPath: keyPath || null,
  });
}

export async function getSystemSshConfigs(): Promise<SshConfig[]> {
  try {
    return await invoke<SshConfig[]>("ssh_list_system_configs");
  } catch (_e) {
    return [];
  }
}

export function getSavedSshProfiles(): SshConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SshConfig[]) : [];
  } catch (_e) {
    return [];
  }
}

export function saveSshProfile(profile: SshConfig): SshConfig[] {
  const current = getSavedSshProfiles();
  const index = current.findIndex((p) => p.id === profile.id);
  let updated: SshConfig[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = profile;
  } else {
    updated = [...current, profile];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteSshProfile(id: string): SshConfig[] {
  const current = getSavedSshProfiles();
  const updated = current.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
