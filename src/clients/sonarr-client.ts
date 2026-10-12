import { KyHttpClient } from "../ky-client";
import { Api as ApiV3 } from "../__generated__/sonarr/Api";
import { Api as ApiV5 } from "../__generated__/sonarrV5/Api";
import {
  DelayProfileResource,
  DownloadClientConfigResource,
  DownloadClientResource,
  MediaManagementConfigResource,
  NamingConfigResource,
  QualityDefinitionResource,
  QualityProfileResource,
  RemotePathMappingResource,
  ReleaseProfileResource,
  RootFolderResource,
  SystemResource,
  TagResource,
  UiConfigResource,
  CustomFormatResource,
} from "../__generated__/sonarr/data-contracts";
import {
  HealthResource as HealthResourceV5,
  MediaManagementSettingsResource,
  ReleaseProfileResource as ReleaseProfileResourceV5,
  SystemResource as SystemResourceV5,
} from "../__generated__/sonarrV5/data-contracts";
import { logger } from "../logger";
import type { CustomFormatRequest } from "../customFormats/customFormat.types";
import { forceSaveIfDisabled, logConnectionError, validateClientParams } from "./connection";
import type { SonarrMediaManagementResource } from "../mediaManagement/mediaManagement.types";
import type { ReleaseProfileShared, SonarrReleaseProfileResource } from "../releaseProfiles/releaseProfile.types";
import {
  CustomFormatsClient,
  DownloadClientsClient,
  QualityDefinitionsClient,
  QualityProfilesClient,
  SystemClient,
  TagsClient,
} from "./capabilities";
import { SonarrApiVersion } from "../types/common.types";

type SonarrSystemResource = SystemResource | SystemResourceV5;
type SonarrHealthResource = HealthResourceV5[];

/**
 * Sonarr v5 serves the legacy v3 contract at `/api/v3` and a new v5 contract at `/api/v5`, with
 * different resource shapes. Both generated clients are held so each call can be routed to the
 * contract the resolved version selects.
 *
 * Public signatures stay typed against the v3 contract because callers are written against it and
 * because most v5 resources are structurally assignable to their v3 counterparts. Where the two
 * disagree (nullability, enum membership, a field that only exists on one side) the return type is
 * the explicit union of both, so no value is silently presented as something it is not.
 */
export class SonarrClient
  implements
    SystemClient,
    TagsClient,
    DownloadClientsClient<DownloadClientResource>,
    QualityProfilesClient<QualityProfileResource>,
    CustomFormatsClient<CustomFormatResource>,
    QualityDefinitionsClient<QualityDefinitionResource>
{
  private apiV3!: ApiV3<unknown>;
  private apiV5!: ApiV5<unknown>;
  private resolved: SonarrApiVersion = "v3";

  constructor(baseUrl: string, apiKey: string, version: SonarrApiVersion = "v3") {
    this.initialize(baseUrl, apiKey, version);
  }

  private initialize(baseUrl: string, apiKey: string, version: SonarrApiVersion) {
    validateClientParams(baseUrl, apiKey, "SONARR");

    const httpClient = new KyHttpClient({
      headers: {
        "X-Api-Key": apiKey,
      },
      prefix: baseUrl,
    });

    this.apiV3 = new ApiV3(httpClient);
    this.apiV5 = new ApiV5(httpClient);
    this.resolved = version;
  }

  get apiVersion(): SonarrApiVersion {
    return this.resolved;
  }

  /**
   * Reads the contract an instance actually serves. A v5 instance answers `/api/v5/system/status`
   * and also still answers `/api/v3/*`, so a successful v5 probe is the only signal that
   * distinguishes them. Anything else (404, connection failure) means the v3 contract, which is
   * also what Sonarr v4 always serves.
   */
  async probeApiVersion(): Promise<SonarrApiVersion> {
    try {
      await this.apiV5.v5SystemStatusList();
      this.resolved = "v5";
    } catch (error) {
      logger.debug(`Sonarr v5 API not available, using v3 contract: ${String(error)}`);
      this.resolved = "v3";
    }
    return this.resolved;
  }

  /** Routes a call to the delegate for the resolved contract. */
  private route<R3, R5>(v3Call: (api: ApiV3<unknown>) => R3, v5Call: (api: ApiV5<unknown>) => R5): R3 | R5 {
    return this.resolved === "v5" ? v5Call(this.apiV5) : v3Call(this.apiV3);
  }

  /**
   * The v5 contract exposes no PUT for `/api/v5/rootfolder/{id}`, so an update cannot be served
   * there. Failing loudly beats routing to v3 and reporting a success the user did not get.
   */
  private assertRootFolderUpdateSupported(): void {
    if (this.resolved === "v5") {
      throw new Error("Updating root folders is not supported on the Sonarr v5 API.");
    }
  }

  /**
   * The v5 contract moved quality size limits from the quality definition resource onto quality
   * profile items, so writing them through the definition endpoint would be dropped by the server
   * without an error. Rejecting here turns that silent no-op into a reported failure.
   */
  private assertQualityDefinitionSizeLimitsSupported(definitions: QualityDefinitionResource[]): void {
    if (this.resolved !== "v5") {
      return;
    }
    const hasLimits = definitions.some((d) => d.minSize != null || d.maxSize != null || d.preferredSize != null);
    if (hasLimits) {
      throw new Error("Quality definition size limits (min/max/preferred) are not supported on the Sonarr v5 API.");
    }
  }

  /**
   * v5 requires a value on every custom-format specification field that v3 leaves optional
   * (`name`, `implementation`, `implementationName`, `infoLink`, `fields`). An absent value is
   * expressed as null rather than dropped, matching how v3 renders the same absence.
   */
  private toV5CustomFormatRequest(request: CustomFormatRequest) {
    return {
      ...request,
      specifications: request.specifications?.map((specification) => ({
        ...specification,
        name: specification.name ?? null,
        implementation: specification.implementation ?? null,
        implementationName: specification.implementationName ?? null,
        infoLink: specification.infoLink ?? null,
        fields: specification.fields ?? null,
      })),
    };
  }

  /**
   * The v5 contract expresses the indexers a release profile applies to as an `indexerIds` array,
   * where v3 uses a scalar `indexerId`. The sync layer produces the scalar form, so it is expanded
   * here at the point the contract is chosen.
   */
  private toV5ReleaseProfile(profile: ReleaseProfileShared) {
    const { indexerId, ...rest } = profile as ReleaseProfileShared & { indexerId?: number };
    return { ...rest, indexerIds: indexerId != null && indexerId > 0 ? [indexerId] : [] };
  }

  async getLanguages() {
    return this.route(
      (api) => api.v3LanguageList(),
      (api) => api.v5LanguageList(),
    );
  }

  // Quality Management
  getQualityDefinitions() {
    return this.route(
      (api) => api.v3QualitydefinitionList(),
      (api) => api.v5QualitydefinitionList(),
    );
  }

  async updateQualityDefinitions(definitions: QualityDefinitionResource[]) {
    this.assertQualityDefinitionSizeLimitsSupported(definitions);
    await this.route(
      (api) => api.v3QualitydefinitionUpdateUpdate(definitions),
      (api) => api.v5QualitydefinitionUpdate2(definitions),
    );
    return this.getQualityDefinitions();
  }

  // Quality Profiles
  getQualityProfiles() {
    return this.route(
      (api) => api.v3QualityprofileList(),
      (api) => api.v5QualityprofileList(),
    );
  }

  createQualityProfile(profile: QualityProfileResource) {
    return this.route(
      (api) => api.v3QualityprofileCreate(profile),
      (api) => api.v5QualityprofileCreate(profile),
    );
  }

  updateQualityProfile(id: string, profile: QualityProfileResource) {
    return this.route(
      (api) => api.v3QualityprofileUpdate(id, profile),
      (api) => api.v5QualityprofileUpdate(id, profile),
    );
  }

  deleteQualityProfile(id: string): Promise<void> {
    return this.route(
      (api) => api.v3QualityprofileDelete(Number(id)),
      (api) => api.v5QualityprofileDelete(Number(id)),
    );
  }

  // Custom Formats
  getCustomFormats() {
    return this.route(
      (api) => api.v3CustomformatList(),
      (api) => api.v5CustomformatList(),
    );
  }

  createCustomFormat(format: CustomFormatRequest) {
    return this.route(
      (api) => api.v3CustomformatCreate(format),
      (api) => api.v5CustomformatCreate(this.toV5CustomFormatRequest(format)),
    );
  }

  updateCustomFormat(id: string, format: CustomFormatRequest) {
    return this.route(
      (api) => api.v3CustomformatUpdate(id, format),
      (api) => api.v5CustomformatUpdate(id, this.toV5CustomFormatRequest(format)),
    );
  }

  deleteCustomFormat(id: string) {
    return this.route(
      (api) => api.v3CustomformatDelete(+id),
      (api) => api.v5CustomformatDelete(+id),
    );
  }

  async getNaming(): Promise<NamingConfigResource> {
    return this.route(
      (api) => api.v3ConfigNamingList(),
      (api) => api.v5SettingsNamingList(),
    );
  }

  async updateNaming(id: string, data: NamingConfigResource): Promise<NamingConfigResource> {
    return this.route(
      (api) => api.v3ConfigNamingUpdate(id, data),
      (api) => api.v5SettingsNamingUpdate(id, data),
    );
  }

  async getMediamanagement(): Promise<SonarrMediaManagementResource> {
    return this.route(
      (api) => api.v3ConfigMediamanagementList(),
      (api) => api.v5SettingsMediamanagementList(),
    );
  }

  async updateMediamanagement(id: string, data: SonarrMediaManagementResource): Promise<SonarrMediaManagementResource> {
    if (this.resolved === "v5") {
      return this.apiV5.v5SettingsMediamanagementUpdate(id, data as MediaManagementSettingsResource);
    }
    return this.apiV3.v3ConfigMediamanagementUpdate(id, data as MediaManagementConfigResource);
  }

  async getUiConfig(): Promise<UiConfigResource> {
    return this.route(
      (api) => api.v3ConfigUiList(),
      (api) => api.v5SettingsUiList(),
    );
  }

  async updateUiConfig(id: string, data: UiConfigResource): Promise<UiConfigResource> {
    return this.route(
      (api) => api.v3ConfigUiUpdate(id, data),
      (api) => api.v5SettingsUiUpdate(id, data),
    );
  }

  async getRootfolders(): Promise<RootFolderResource[]> {
    return this.route(
      (api) => api.v3RootfolderList(),
      (api) => api.v5RootfolderList(),
    );
  }

  async addRootFolder(data: RootFolderResource): Promise<RootFolderResource> {
    return this.route(
      (api) => api.v3RootfolderCreate(data),
      (api) => api.v5RootfolderCreate(data),
    );
  }

  async updateRootFolder(id: string, data: RootFolderResource): Promise<RootFolderResource> {
    this.assertRootFolderUpdateSupported();
    throw new Error("Sonarr does not support updating root folders");
  }

  async deleteRootFolder(id: string): Promise<void> {
    return this.route(
      (api) => api.v3RootfolderDelete(+id),
      (api) => api.v5RootfolderDelete(+id),
    );
  }

  // Delay Profiles
  async getDelayProfiles(): Promise<DelayProfileResource[]> {
    return this.route(
      (api) => api.v3DelayprofileList(),
      (api) => api.v5DelayprofileList(),
    );
  }

  async createDelayProfile(profile: DelayProfileResource): Promise<DelayProfileResource> {
    return this.route(
      (api) => api.v3DelayprofileCreate(profile),
      (api) => api.v5DelayprofileCreate(profile),
    );
  }

  async updateDelayProfile(id: string, data: DelayProfileResource): Promise<DelayProfileResource> {
    return this.route(
      (api) => api.v3DelayprofileUpdate(id, data),
      (api) => api.v5DelayprofileUpdate(id, data),
    );
  }

  async deleteDelayProfile(id: string): Promise<void> {
    return this.route(
      (api) => api.v3DelayprofileDelete(+id),
      (api) => api.v5DelayprofileDelete(+id),
    );
  }

  async getReleaseProfiles(): Promise<SonarrReleaseProfileResource[]> {
    return this.route(
      (api) => api.v3ReleaseprofileList(),
      (api) => api.v5ReleaseprofileList(),
    );
  }

  async createReleaseProfile(profile: ReleaseProfileShared): Promise<unknown> {
    return this.route(
      (api) => api.v3ReleaseprofileCreate(profile as ReleaseProfileResource),
      (api) => api.v5ReleaseprofileCreate(this.toV5ReleaseProfile(profile)),
    );
  }

  async updateReleaseProfile(id: string, profile: ReleaseProfileShared): Promise<unknown> {
    return this.route(
      (api) => api.v3ReleaseprofileUpdate(id, profile as ReleaseProfileResource),
      (api) => api.v5ReleaseprofileUpdate(id, this.toV5ReleaseProfile(profile)),
    );
  }

  async deleteReleaseProfile(id: string): Promise<void> {
    return this.route(
      (api) => api.v3ReleaseprofileDelete(+id),
      (api) => api.v5ReleaseprofileDelete(+id),
    );
  }

  async getIndexers() {
    return this.route(
      (api) => api.v3IndexerList(),
      (api) => api.v5IndexerList(),
    );
  }

  async getTags(): Promise<TagResource[]> {
    return this.route(
      (api) => api.v3TagList(),
      (api) => api.v5TagList(),
    );
  }

  async createTag(tag: TagResource): Promise<TagResource> {
    return this.route(
      (api) => api.v3TagCreate(tag),
      (api) => api.v5TagCreate(tag),
    );
  }

  async deleteTag(id: string): Promise<void> {
    return this.route(
      (api) => api.v3TagDelete(+id),
      (api) => api.v5TagDelete(+id),
    );
  }

  // Download Clients
  async getDownloadClientSchema(): Promise<DownloadClientResource[]> {
    return this.route(
      (api) => api.v3DownloadclientSchemaList(),
      (api) => api.v5DownloadclientSchemaList(),
    );
  }

  async getDownloadClients(): Promise<DownloadClientResource[]> {
    return this.route(
      (api) => api.v3DownloadclientList(),
      (api) => api.v5DownloadclientList(),
    );
  }

  async createDownloadClient(client: DownloadClientResource): Promise<DownloadClientResource> {
    // v3 accepts a forceSave flag that lets a disabled client be written; the v5 contract has no
    // equivalent, so the flag is dropped there rather than silently reinterpreted.
    return this.route(
      (api) => api.v3DownloadclientCreate(client, forceSaveIfDisabled(client.enable)),
      (api) => api.v5DownloadclientCreate(client),
    );
  }

  async updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.route(
      (api) => api.v3DownloadclientUpdate(+id, client, forceSaveIfDisabled(client.enable)),
      (api) => api.v5DownloadclientUpdate(+id, client),
    );
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.route(
      (api) => api.v3DownloadclientDelete(+id),
      (api) => api.v5DownloadclientDelete(+id),
    );
  }

  async testDownloadClient(client: DownloadClientResource): Promise<void> {
    return this.route(
      (api) => api.v3DownloadclientTestCreate(client),
      (api) => api.v5DownloadclientTestCreate(client),
    );
  }

  // Download Client Configuration
  async getDownloadClientConfig(): Promise<DownloadClientConfigResource> {
    return this.route(
      (api) => api.v3ConfigDownloadclientList(),
      (api) => api.v5SettingsDownloadclientList(),
    );
  }

  async updateDownloadClientConfig(id: string, config: DownloadClientConfigResource): Promise<DownloadClientConfigResource> {
    return this.route(
      (api) => api.v3ConfigDownloadclientUpdate(id, config),
      (api) => api.v5SettingsDownloadclientUpdate(id, config),
    );
  }

  // Remote Path Mappings
  async getRemotePathMappings(): Promise<RemotePathMappingResource[]> {
    return this.route(
      (api) => api.v3RemotepathmappingList(),
      (api) => api.v5RemotepathmappingList(),
    );
  }

  async createRemotePathMapping(mapping: RemotePathMappingResource): Promise<RemotePathMappingResource> {
    return this.route(
      (api) => api.v3RemotepathmappingCreate(mapping),
      (api) => api.v5RemotepathmappingCreate(mapping),
    );
  }

  async updateRemotePathMapping(id: string, mapping: RemotePathMappingResource): Promise<RemotePathMappingResource> {
    return this.route(
      (api) => api.v3RemotepathmappingUpdate(id, mapping),
      (api) => api.v5RemotepathmappingUpdate(id, mapping),
    );
  }

  async deleteRemotePathMapping(id: string): Promise<void> {
    return this.route(
      (api) => api.v3RemotepathmappingDelete(+id),
      (api) => api.v5RemotepathmappingDelete(+id),
    );
  }

  // System/Health Check
  getSystemStatus(): Promise<SonarrSystemResource> {
    return this.route(
      (api) => api.v3SystemStatusList(),
      (api) => api.v5SystemStatusList(),
    );
  }

  async testConnection() {
    try {
      await this.route(
        (api) => api.v3HealthList(),
        (api) => api.v5HealthList(),
      );
    } catch (error) {
      const message = logConnectionError(error, "SONARR");
      logger.error(message);
      return false;
    }

    return true;
  }
}
