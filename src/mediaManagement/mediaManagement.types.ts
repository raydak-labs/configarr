import type { MediaManagementConfigResource } from "../__generated__/sonarr/data-contracts";
import type { MediaManagementSettingsResource } from "../__generated__/sonarrV5/data-contracts";

/**
 * The media-management resource as served by either Sonarr API contract. The v3 and v5 shapes are
 * identical except that v5 allows null where v3 omits the field, most visibly on
 * `recycleBinCleanupDays`, so neither one is assignable to the other. `MediaManagementSync` puts
 * this type in both input and output position, which makes the union the only representation that
 * lets one sync object serve a client that may be bound to either contract.
 */
export type SonarrMediaManagementResource = MediaManagementConfigResource | MediaManagementSettingsResource;
