import { invoke } from "@tauri-apps/api/core";

/** Dispatched on window once an in-app update finished installing. */
export const UPDATE_INSTALLED_EVENT = "novaterm:update-installed";

/** True once the installed app file was replaced and has stopped changing. */
export function appUpdatedOnDisk(): Promise<boolean> {
  return invoke<boolean>("app_updated_on_disk");
}

export function relaunchApp(): Promise<void> {
  return invoke("relaunch_app");
}
