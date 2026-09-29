import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plug01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect } from "react";
import { usePortsStore } from "./portsStore";

export function PortsStatusPill() {
  const ports = usePortsStore((s) => s.ports);
  const tunnels = usePortsStore((s) => s.tunnels);
  const setOpen = usePortsStore((s) => s.setOpen);
  const fetchPorts = usePortsStore((s) => s.fetchPorts);

  useEffect(() => {
    void fetchPorts();
  }, [fetchPorts]);

  const count = ports.length;
  const tunnelCount = tunnels.length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-6 shrink-0 items-center gap-1 rounded-sm px-1.5 text-[11px] text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
        >
          <HugeiconsIcon icon={Plug01Icon} size={13} strokeWidth={1.75} />
          <span>
            Ports{count > 0 ? ` (${count}${tunnelCount > 0 ? ` +${tunnelCount}` : ""})` : ""}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {count > 0
          ? `${count} listening port${count === 1 ? "" : "s"} detected. Click to view or forward.`
          : "View listening ports and manage port forwarding."}
      </TooltipContent>
    </Tooltip>
  );
}
