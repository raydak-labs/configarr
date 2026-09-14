import { InputConfigIndexerProxy, InputConfigIndexerProxySchema } from "../types/config.types";
import { ProviderResourceSync } from "./providerResourceSync";
import { IndexerProxyResource } from "./types";

/**
 * Syncs Prowlarr indexer proxies (FlareSolverr, HTTP, SOCKS4/5). Matched by
 * `name` + `implementation`; only `fields` and `tags` are managed.
 */
export class IndexerProxySync extends ProviderResourceSync<InputConfigIndexerProxy, IndexerProxyResource> {
  protected readonly label = "IndexerProxy";
  protected readonly configSchema = InputConfigIndexerProxySchema;

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

  protected findTemplate(config: InputConfigIndexerProxy, schema: IndexerProxyResource[]) {
    return schema.find((s) => s.implementation?.toLowerCase() === config.type.toLowerCase());
  }
  protected templateHint(config: InputConfigIndexerProxy) {
    return config.type;
  }
  protected configKey(config: InputConfigIndexerProxy) {
    return `${config.name}::${config.type.toLowerCase()}`;
  }
  protected serverKey(server: IndexerProxyResource) {
    return `${server.name ?? ""}::${server.implementation?.toLowerCase() ?? ""}`;
  }
}
