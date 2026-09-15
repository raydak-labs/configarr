export type DelayProfileProtocolItem = {
  name?: string | null;
  protocol?: string | null;
  allowed?: boolean;
  delay?: number;
};

export type DelayProfileShared = {
  id?: number;
  tags?: number[] | null;
  order?: number;
  bypassIfHighestQuality?: boolean;
  bypassIfAboveCustomFormatScore?: boolean;
  minimumCustomFormatScore?: number;
  name?: string | null;
};

export type DelayProfileGenericResource = DelayProfileShared & {
  enableUsenet?: boolean;
  enableTorrent?: boolean;
  preferredProtocol?: string;
  usenetDelay?: number;
  torrentDelay?: number;
};

export type DelayProfileLidarrResource = DelayProfileShared & { items: DelayProfileProtocolItem[] };

export type DelayProfilePayload = DelayProfileGenericResource | DelayProfileLidarrResource;

export type DelayProfileGenericArrType = "SONARR" | "RADARR" | "READARR" | "WHISPARR";
