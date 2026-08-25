import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { setCustomEnvVars } from "@/modules/settings/store";
import { SectionHeader } from "../components/SectionHeader";
import { SettingRow } from "../components/SettingRow";

export function VaultSection() {
  const customEnvVars = usePreferencesStore((s) => s.customEnvVars);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [isAwsSyncing, setIsAwsSyncing] = useState(false);
  const [awsSecretId, setAwsSecretId] = useState("");
  const [awsProfile, setAwsProfile] = useState("");
  const [awsRegion, setAwsRegion] = useState("");
  const [showAwsSync, setShowAwsSync] = useState(false);

  const handleAwsSync = async () => {
    if (!awsSecretId.trim()) return;
    setIsAwsSyncing(true);
    try {
      const result = await invoke<string>("aws_sync_secret", {
        secretId: awsSecretId.trim(),
        profile: awsProfile.trim(),
        region: awsRegion.trim()
      });
      
      const parsed = JSON.parse(result);
      if (typeof parsed !== "object" || parsed === null) throw new Error("AWS Secret was not a JSON object");
      
      const next = { ...customEnvVars };
      let count = 0;
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          next[k] = String(v);
          count++;
        }
      }
      setCustomEnvVars(next);
      toast.success(`Successfully synced ${count} secrets from AWS`);
      setShowAwsSync(false);
      setAwsSecretId("");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setIsAwsSyncing(false);
    }
  };


  const handleAdd = () => {
    if (!newKey.trim()) return;
    setCustomEnvVars({ ...customEnvVars, [newKey.trim()]: newVal });
    setNewKey("");
    setNewVal("");
  };

  const handleRemove = (k: string) => {
    const next = { ...customEnvVars };
    delete next[k];
    setCustomEnvVars(next);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader 
        title="Enterprise Secrets" 
        description="Variables defined here are securely injected directly into the active memory of new terminal sessions. They are never written to disk by the terminal runtime, keeping them safe from accidental git commits."
      />

      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-[12px] h-8 flex items-center gap-2"
            onClick={() => setShowAwsSync(!showAwsSync)}
          >
            <span>☁️</span> AWS Secrets Manager Sync
          </Button>
        </div>
        
        {showAwsSync && (
          <div className="flex flex-col gap-3 p-4 rounded-lg border border-border/80 bg-muted/20 animate-in slide-in-from-top-2">
            <h3 className="text-[13px] font-medium">Sync from AWS Secrets Manager</h3>
            <div className="grid grid-cols-3 gap-3">
              <Input 
                placeholder="Secret ID (e.g. prod/env)" 
                value={awsSecretId} 
                onChange={(e) => setAwsSecretId(e.target.value)} 
                className="h-8 text-[12px] font-mono col-span-3"
              />
              <Input 
                placeholder="Profile (optional)" 
                value={awsProfile} 
                onChange={(e) => setAwsProfile(e.target.value)} 
                className="h-8 text-[12px] font-mono col-span-1"
              />
              <Input 
                placeholder="Region (optional)" 
                value={awsRegion} 
                onChange={(e) => setAwsRegion(e.target.value)} 
                className="h-8 text-[12px] font-mono col-span-1"
              />
              <Button 
                onClick={handleAwsSync} 
                disabled={isAwsSyncing || !awsSecretId.trim()}
                className="h-8 text-[12px] col-span-1"
              >
                {isAwsSyncing ? "Syncing..." : "Sync Secrets"}
              </Button>
            </div>
            <span className="text-[11px] text-muted-foreground">The AWS CLI must be installed and authenticated on this machine.</span>
          </div>
        )}

        {Object.entries(customEnvVars).length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/30 p-8 text-center">
            <span className="text-[12px] text-muted-foreground">No secrets configured. Add your first secret below.</span>
          </div>
        ) : (
          <div className="flex flex-col rounded-lg border border-border/80 bg-card/50 shadow-sm overflow-hidden divide-y divide-border/40">
            {Object.entries(customEnvVars).map(([k, _v]) => (
              <div key={k} className="group flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
                    <span className="text-[14px]">🔑</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium font-mono text-foreground">{k}</span>
                    <span className="text-[11px] text-muted-foreground font-mono mt-0.5">••••••••••••</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleRemove(k)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-3 text-[11px] text-destructive hover:bg-destructive/10"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <SettingRow title="Add New Secret" description="Key and value to inject into your shell.">
        <div className="flex items-center gap-2">
          <Input 
            placeholder="KEY (e.g. AWS_ACCESS_KEY)" 
            value={newKey} 
            onChange={(e) => setNewKey(e.target.value)} 
            className="h-8 w-48 rounded-md border border-border bg-background px-2.5 text-[12px] font-mono outline-none focus:border-foreground/40"
          />
          <Input 
            type="password"
            placeholder="Value" 
            value={newVal} 
            onChange={(e) => setNewVal(e.target.value)} 
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-8 w-48 rounded-md border border-border bg-background px-2.5 text-[12px] font-mono outline-none focus:border-foreground/40"
          />
          <Button 
            onClick={handleAdd} 
            disabled={!newKey.trim()}
            className="h-8 px-4 text-[12px] bg-foreground text-background hover:bg-foreground/90"
          >
            Add
          </Button>
        </div>
      </SettingRow>
    </div>
  );
}
