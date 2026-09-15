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
