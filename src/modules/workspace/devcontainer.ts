import { invoke } from "@tauri-apps/api/core";

export type DevContainerConfig = {
  name?: string;
  image?: string;
  dockerfile?: string;
  forward_ports: number[];
  workspace_folder?: string;
};

export type DevContainerDetection = {
  detected: boolean;
  config_path?: string;
  config?: DevContainerConfig;
  docker_available: boolean;
  docker_version?: string;
};

export type DockerContainer = {
  id: string;
  names: string;
  image: string;
  status: string;
  ports: string;
};

export async function detectDevContainer(
  workspacePath: string
): Promise<DevContainerDetection> {
  try {
    return await invoke<DevContainerDetection>("devcontainer_detect", {
      workspacePath,
    });
  } catch (e) {
    return {
      detected: false,
      docker_available: false,
    };
  }
}

export async function listDockerContainers(): Promise<DockerContainer[]> {
  try {
    return await invoke<DockerContainer[]>("devcontainer_list_containers");
  } catch (_e) {
    return [];
  }
}

export async function startDevContainer(
  workspacePath: string,
  image?: string,
  dockerfile?: string
): Promise<string> {
  return invoke<string>("devcontainer_start", {
    workspacePath,
    image: image || null,
    dockerfile: dockerfile || null,
  });
}
