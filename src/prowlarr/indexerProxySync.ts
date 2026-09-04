import { z } from "zod";
import { InputConfigIndexerProxy } from "../types/config.types";
import { ProviderResourceSync } from "./providerResourceSync";
import { IndexerProxyResource } from "./types";

const IndexerProxyConfigSchema = z.object({
  name: z.string().min(1, "Indexer proxy name is required"),
  type: z.string().min(1, "Indexer proxy type is required"),
  fields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.union([z.string().min(1), z.number().int().positive()])).optional(),
});

type IndexerProxyConfig = InputConfigIndexerProxy;

/**
 * Syncs Prowlarr indexer proxies (FlareSolverr, HTTP, SOCKS4/5). Matched by
 * `name` + `implementation`; only `fields` and `tags` are managed.
 */
export class IndexerProxySync extends ProviderResourceSync<IndexerProxyConfig, IndexerProxyResource> {
  protected readonly label = "IndexerProxy";
  protected readonly configSchema = IndexerProxyConfigSchema;

  protected fetchSchema() {
    return this.apiClient.getIndexerProxySchema();
  }
  protected fetchServer() {
    return this.apiClient.getIndexerProxies();
  }
  protected createResource(payload: IndexerProxyResource) {
    return this.apiClient.createIndexerProxy(payload);
  }
  protected updateResource(id: string, payload: IndexerProxyResource) {
    return this.apiClient.updateIndexerProxy(id, payload);
  }
  protected deleteResource(id: string) {
    return this.apiClient.deleteIndexerProxy(id);
  }

  protected findTemplate(config: IndexerProxyConfig, schema: IndexerProxyResource[]) {
    return schema.find((s) => s.implementation?.toLowerCase() === config.type.toLowerCase());
  }
  protected templateHint(config: IndexerProxyConfig) {
    return config.type;
  }
  protected matches(config: IndexerProxyConfig, server: IndexerProxyResource) {
    return config.name === server.name && config.type.toLowerCase() === server.implementation?.toLowerCase();
  }
  protected configKey(config: IndexerProxyConfig) {
    return `${config.name}::${config.type.toLowerCase()}`;
  }
  protected serverKey(server: IndexerProxyResource) {
    return `${server.name ?? ""}::${server.implementation?.toLowerCase() ?? ""}`;
  }
}
