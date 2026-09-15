export type DelayProfileProtocolItem = {
  name?: string | null;
  protocol?: string | null;
  allowed?: boolean;
  delay?: number;
};

/** Mapping payload. Lidarr nightly accepts `items`; other *arrs use usenet/torrent fields. */
export type DelayProfilePayload = {
  id?: number;
  enableUsenet?: boolean;
  enableTorrent?: boolean;
  preferredProtocol?: string;
  usenetDelay?: number;
  torrentDelay?: number;
  bypassIfHighestQuality?: boolean;
  bypassIfAboveCustomFormatScore?: boolean;
  minimumCustomFormatScore?: number;
  order?: number;
  tags?: number[] | null;
  name?: string | null;
  items?: DelayProfileProtocolItem[] | null;
};
