export type ListeningPort = {
  port: number;
  process: string;
  pid?: number;
  ip: string;
  source: string;
  forwarded_to?: number;
};

export type ActiveTunnel = {
  id: number;
  local_port: number;
  remote_port: number;
  host: string;
  user?: string;
};
