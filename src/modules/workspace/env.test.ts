import { describe, expect, it } from "vitest";
import {
  LOCAL_WORKSPACE,
  parseWorkspaceScopeKey,
  workspaceScopeKey,
  type DevContainerWorkspaceEnv,
  type SshWorkspaceEnv,
} from "./env";

describe("workspace scope keys", () => {
  it("formats local workspace key", () => {
    expect(workspaceScopeKey(LOCAL_WORKSPACE)).toBe("local");
  });

  it("formats wsl workspace key", () => {
    expect(workspaceScopeKey({ kind: "wsl", distro: "Ubuntu-22.04" })).toBe(
      "wsl:Ubuntu-22.04"
    );
  });

  it("formats ssh workspace key", () => {
    const ssh: SshWorkspaceEnv = {
      kind: "ssh",
      id: "ssh-prod",
      label: "Production",
      host: "prod.example.com",
      remote_path: "/var/www",
    };
    expect(workspaceScopeKey(ssh)).toBe("ssh:ssh-prod");
  });

  it("formats devcontainer workspace key", () => {
    const dc: DevContainerWorkspaceEnv = {
      kind: "devcontainer",
      container_id: "c12345",
      name: "node-20",
      remote_path: "/workspaces/app",
    };
    expect(workspaceScopeKey(dc)).toBe("devcontainer:c12345");
  });

  it("parses wsl scope key", () => {
    expect(parseWorkspaceScopeKey("wsl:Debian")).toEqual({
      kind: "wsl",
      distro: "Debian",
    });
  });

  it("falls back to local for other scope keys", () => {
    expect(parseWorkspaceScopeKey("local")).toEqual(LOCAL_WORKSPACE);
    expect(parseWorkspaceScopeKey("unknown")).toEqual(LOCAL_WORKSPACE);
  });
});
