export type QualityDefinitionPayload = {
  id?: number;
  title?: string | null;
  weight?: number;
  minSize?: number | null;
  maxSize?: number | null;
  preferredSize?: number | null;
  quality?: {
    id?: number;
    name?: string | null;
    source?: string;
    resolution?: number;
  } | null;
};
