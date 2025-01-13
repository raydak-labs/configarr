/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface AddAlbumOptions {
  addType?: AlbumAddType;
  searchForNewAlbum?: boolean;
}

export interface AddArtistOptions {
  monitor?: MonitorTypes;
  albumsToMonitor?: string[] | null;
  monitored?: boolean;
  searchForMissingAlbums?: boolean;
}

export enum AlbumAddType {
  Automatic = "automatic",
  Manual = "manual",
}

export interface AlbumReleaseResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  albumId?: number;
  foreignReleaseId?: string | null;
  title?: string | null;
  status?: string | null;
  /** @format int32 */
  duration?: number;
  /** @format int32 */
  trackCount?: number;
  media?: MediumResource[] | null;
  /** @format int32 */
  mediumCount?: number;
  disambiguation?: string | null;
  country?: string[] | null;
  label?: string[] | null;
  format?: string | null;
  monitored?: boolean;
}

export interface AlbumResource {
  /** @format int32 */
  id?: number;
  title?: string | null;
  disambiguation?: string | null;
  overview?: string | null;
  /** @format int32 */
  artistId?: number;
  foreignAlbumId?: string | null;
  monitored?: boolean;
  anyReleaseOk?: boolean;
  /** @format int32 */
  profileId?: number;
  /** @format int32 */
  duration?: number;
  albumType?: string | null;
  secondaryTypes?: string[] | null;
  /** @format int32 */
  mediumCount?: number;
  ratings?: Ratings;
  /** @format date-time */
  releaseDate?: string | null;
  releases?: AlbumReleaseResource[] | null;
  genres?: string[] | null;
  media?: MediumResource[] | null;
  artist?: ArtistResource;
  images?: MediaCover[] | null;
  links?: Links[] | null;
  /** @format date-time */
  lastSearchTime?: string | null;
  statistics?: AlbumStatisticsResource;
  addOptions?: AddAlbumOptions;
  remoteCover?: string | null;
}

export interface AlbumResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: AlbumResource[] | null;
}

export interface AlbumStatisticsResource {
  /** @format int32 */
  trackFileCount?: number;
  /** @format int32 */
  trackCount?: number;
  /** @format int32 */
  totalTrackCount?: number;
  /** @format int64 */
  sizeOnDisk?: number;
  /** @format double */
  percentOfTracks?: number;
}

export interface AlbumStudioArtistResource {
  /** @format int32 */
  id?: number;
  monitored?: boolean | null;
  albums?: AlbumResource[] | null;
}

export interface AlbumStudioResource {
  artist?: AlbumStudioArtistResource[] | null;
  monitoringOptions?: MonitoringOptions;
  monitorNewItems?: NewItemMonitorTypes;
}

export interface AlbumsMonitoredResource {
  albumIds?: number[] | null;
  monitored?: boolean;
}

export enum AllowFingerprinting {
  Never = "never",
  NewFiles = "newFiles",
  AllFiles = "allFiles",
}

export enum ApplyTags {
  Add = "add",
  Remove = "remove",
  Replace = "replace",
}

export interface ArtistEditorResource {
  artistIds?: number[] | null;
  monitored?: boolean | null;
  monitorNewItems?: NewItemMonitorTypes;
  /** @format int32 */
  qualityProfileId?: number | null;
  /** @format int32 */
  metadataProfileId?: number | null;
  rootFolderPath?: string | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  moveFiles?: boolean;
  deleteFiles?: boolean;
  addImportListExclusion?: boolean;
}

export interface ArtistResource {
  /** @format int32 */
  id?: number;
  status?: ArtistStatusType;
  ended?: boolean;
  artistName?: string | null;
  foreignArtistId?: string | null;
  mbId?: string | null;
  /** @format int32 */
  tadbId?: number;
  /** @format int32 */
  discogsId?: number;
  allMusicId?: string | null;
  overview?: string | null;
  artistType?: string | null;
  disambiguation?: string | null;
  links?: Links[] | null;
  nextAlbum?: AlbumResource;
  lastAlbum?: AlbumResource;
  images?: MediaCover[] | null;
  members?: Member[] | null;
  remotePoster?: string | null;
  path?: string | null;
  /** @format int32 */
  qualityProfileId?: number;
  /** @format int32 */
  metadataProfileId?: number;
  monitored?: boolean;
  monitorNewItems?: NewItemMonitorTypes;
  rootFolderPath?: string | null;
  folder?: string | null;
  genres?: string[] | null;
  cleanName?: string | null;
  sortName?: string | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  /** @format date-time */
  added?: string;
  addOptions?: AddArtistOptions;
  ratings?: Ratings;
  statistics?: ArtistStatisticsResource;
}

export interface ArtistStatisticsResource {
  /** @format int32 */
  albumCount?: number;
  /** @format int32 */
  trackFileCount?: number;
  /** @format int32 */
  trackCount?: number;
  /** @format int32 */
  totalTrackCount?: number;
  /** @format int64 */
  sizeOnDisk?: number;
  /** @format double */
  percentOfTracks?: number;
}

export enum ArtistStatusType {
  Continuing = "continuing",
  Ended = "ended",
}

export interface ArtistTitleInfo {
  title?: string | null;
  titleWithoutYear?: string | null;
  /** @format int32 */
  year?: number;
}

export enum AuthenticationRequiredType {
  Enabled = "enabled",
  DisabledForLocalAddresses = "disabledForLocalAddresses",
}

export enum AuthenticationType {
  None = "none",
  Basic = "basic",
  Forms = "forms",
  External = "external",
}

export interface AutoTaggingResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  removeTagsAutomatically?: boolean;
  /** @uniqueItems true */
  tags?: number[] | null;
  specifications?: AutoTaggingSpecificationSchema[] | null;
}

export interface AutoTaggingSpecificationSchema {
  /** @format int32 */
  id?: number;
  name?: string | null;
  implementation?: string | null;
  implementationName?: string | null;
  negate?: boolean;
  required?: boolean;
  fields?: Field[] | null;
}

export interface BackupResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  path?: string | null;
  type?: BackupType;
  /** @format int64 */
  size?: number;
  /** @format date-time */
  time?: string;
}

export enum BackupType {
  Scheduled = "scheduled",
  Manual = "manual",
  Update = "update",
}

export interface BlocklistBulkResource {
  ids?: number[] | null;
}

export interface BlocklistResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  artistId?: number;
  albumIds?: number[] | null;
  sourceTitle?: string | null;
  quality?: QualityModel;
  customFormats?: CustomFormatResource[] | null;
  /** @format date-time */
  date?: string;
  protocol?: DownloadProtocol;
  indexer?: string | null;
  message?: string | null;
  artist?: ArtistResource;
}

export interface BlocklistResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: BlocklistResource[] | null;
}

export enum CertificateValidationType {
  Enabled = "enabled",
  DisabledForLocalAddresses = "disabledForLocalAddresses",
  Disabled = "disabled",
}

export interface Command {
  sendUpdatesToClient?: boolean;
  updateScheduledTask?: boolean;
  completionMessage?: string | null;
  requiresDiskAccess?: boolean;
  isExclusive?: boolean;
  isTypeExclusive?: boolean;
  isLongRunning?: boolean;
  name?: string | null;
  /** @format date-time */
  lastExecutionTime?: string | null;
  /** @format date-time */
  lastStartTime?: string | null;
  trigger?: CommandTrigger;
  suppressMessages?: boolean;
  clientUserAgent?: string | null;
}

export enum CommandPriority {
  Normal = "normal",
  High = "high",
  Low = "low",
}

export interface CommandResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  commandName?: string | null;
  message?: string | null;
  body?: Command;
  priority?: CommandPriority;
  status?: CommandStatus;
  result?: CommandResult;
  /** @format date-time */
  queued?: string;
  /** @format date-time */
  started?: string | null;
  /** @format date-time */
  ended?: string | null;
  /** @format date-span */
  duration?: string | null;
  exception?: string | null;
  trigger?: CommandTrigger;
  clientUserAgent?: string | null;
  /** @format date-time */
  stateChangeTime?: string | null;
  sendUpdatesToClient?: boolean;
  updateScheduledTask?: boolean;
  /** @format date-time */
  lastExecutionTime?: string | null;
}

export enum CommandResult {
  Unknown = "unknown",
  Successful = "successful",
  Unsuccessful = "unsuccessful",
}

export enum CommandStatus {
  Queued = "queued",
  Started = "started",
  Completed = "completed",
  Failed = "failed",
  Aborted = "aborted",
  Cancelled = "cancelled",
  Orphaned = "orphaned",
}

export enum CommandTrigger {
  Unspecified = "unspecified",
  Manual = "manual",
  Scheduled = "scheduled",
}

export interface CustomFilterResource {
  /** @format int32 */
  id?: number;
  type?: string | null;
  label?: string | null;
  filters?: Record<string, any>[] | null;
}

export interface CustomFormatBulkResource {
  /** @uniqueItems true */
  ids?: number[] | null;
  includeCustomFormatWhenRenaming?: boolean | null;
}

export interface CustomFormatResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  includeCustomFormatWhenRenaming?: boolean | null;
  specifications?: CustomFormatSpecificationSchema[] | null;
}

export interface CustomFormatSpecificationSchema {
  /** @format int32 */
  id?: number;
  name?: string | null;
  implementation?: string | null;
  implementationName?: string | null;
  infoLink?: string | null;
  negate?: boolean;
  required?: boolean;
  fields?: Field[] | null;
  presets?: CustomFormatSpecificationSchema[] | null;
}

export enum DatabaseType {
  SqLite = "sqLite",
  PostgreSQL = "postgreSQL",
}

export interface DelayProfileResource {
  /** @format int32 */
  id?: number;
  enableUsenet?: boolean;
  enableTorrent?: boolean;
  preferredProtocol?: DownloadProtocol;
  /** @format int32 */
  usenetDelay?: number;
  /** @format int32 */
  torrentDelay?: number;
  bypassIfHighestQuality?: boolean;
  bypassIfAboveCustomFormatScore?: boolean;
  /** @format int32 */
  minimumCustomFormatScore?: number;
  /** @format int32 */
  order?: number;
  /** @uniqueItems true */
  tags?: number[] | null;
}

export interface DiskSpaceResource {
  /** @format int32 */
  id?: number;
  path?: string | null;
  label?: string | null;
  /** @format int64 */
  freeSpace?: number;
  /** @format int64 */
  totalSpace?: number;
}

export interface DownloadClientBulkResource {
  ids?: number[] | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  enable?: boolean | null;
  /** @format int32 */
  priority?: number | null;
  removeCompletedDownloads?: boolean | null;
  removeFailedDownloads?: boolean | null;
}

export interface DownloadClientConfigResource {
  /** @format int32 */
  id?: number;
  downloadClientWorkingFolders?: string | null;
  enableCompletedDownloadHandling?: boolean;
  autoRedownloadFailed?: boolean;
  autoRedownloadFailedFromInteractiveSearch?: boolean;
}

export interface DownloadClientResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage;
  /** @uniqueItems true */
  tags?: number[] | null;
  presets?: DownloadClientResource[] | null;
  enable?: boolean;
  protocol?: DownloadProtocol;
  /** @format int32 */
  priority?: number;
  removeCompletedDownloads?: boolean;
  removeFailedDownloads?: boolean;
}

export enum DownloadProtocol {
  Unknown = "unknown",
  Usenet = "usenet",
  Torrent = "torrent",
}

export enum EntityHistoryEventType {
  Unknown = "unknown",
  Grabbed = "grabbed",
  ArtistFolderImported = "artistFolderImported",
  TrackFileImported = "trackFileImported",
  DownloadFailed = "downloadFailed",
  TrackFileDeleted = "trackFileDeleted",
  TrackFileRenamed = "trackFileRenamed",
  AlbumImportIncomplete = "albumImportIncomplete",
  DownloadImported = "downloadImported",
  TrackFileRetagged = "trackFileRetagged",
  DownloadIgnored = "downloadIgnored",
}

export interface Field {
  /** @format int32 */
  order?: number;
  name?: string | null;
  label?: string | null;
  unit?: string | null;
  helpText?: string | null;
  helpTextWarning?: string | null;
  helpLink?: string | null;
  value?: any;
  type?: string | null;
  advanced?: boolean;
  selectOptions?: SelectOption[] | null;
  selectOptionsProviderAction?: string | null;
  section?: string | null;
  hidden?: string | null;
  privacy?: PrivacyLevel;
  placeholder?: string | null;
  isFloat?: boolean;
}

export enum FileDateType {
  None = "none",
  AlbumReleaseDate = "albumReleaseDate",
}

export enum HealthCheckResult {
  Ok = "ok",
  Notice = "notice",
  Warning = "warning",
  Error = "error",
}

export interface HealthResource {
  /** @format int32 */
  id?: number;
  source?: string | null;
  type?: HealthCheckResult;
  message?: string | null;
  wikiUrl?: HttpUri;
}

export interface HistoryResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  albumId?: number;
  /** @format int32 */
  artistId?: number;
  /** @format int32 */
  trackId?: number;
  sourceTitle?: string | null;
  quality?: QualityModel;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  qualityCutoffNotMet?: boolean;
  /** @format date-time */
  date?: string;
  downloadId?: string | null;
  eventType?: EntityHistoryEventType;
  data?: Record<string, string | null>;
  album?: AlbumResource;
  artist?: ArtistResource;
  track?: TrackResource;
}

export interface HistoryResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: HistoryResource[] | null;
}

export interface HostConfigResource {
  /** @format int32 */
  id?: number;
  bindAddress?: string | null;
  /** @format int32 */
  port?: number;
  /** @format int32 */
  sslPort?: number;
  enableSsl?: boolean;
  launchBrowser?: boolean;
  authenticationMethod?: AuthenticationType;
  authenticationRequired?: AuthenticationRequiredType;
  analyticsEnabled?: boolean;
  username?: string | null;
  password?: string | null;
  passwordConfirmation?: string | null;
  logLevel?: string | null;
  /** @format int32 */
  logSizeLimit?: number;
  consoleLogLevel?: string | null;
  branch?: string | null;
  apiKey?: string | null;
  sslCertPath?: string | null;
  sslCertPassword?: string | null;
  urlBase?: string | null;
  instanceName?: string | null;
  applicationUrl?: string | null;
  updateAutomatically?: boolean;
  updateMechanism?: UpdateMechanism;
  updateScriptPath?: string | null;
  proxyEnabled?: boolean;
  proxyType?: ProxyType;
  proxyHostname?: string | null;
  /** @format int32 */
  proxyPort?: number;
  proxyUsername?: string | null;
  proxyPassword?: string | null;
  proxyBypassFilter?: string | null;
  proxyBypassLocalAddresses?: boolean;
  certificateValidation?: CertificateValidationType;
  backupFolder?: string | null;
  /** @format int32 */
  backupInterval?: number;
  /** @format int32 */
  backupRetention?: number;
  trustCgnatIpAddresses?: boolean;
}

export interface HttpUri {
  fullUri?: string | null;
  scheme?: string | null;
  host?: string | null;
  /** @format int32 */
  port?: number | null;
  path?: string | null;
  query?: string | null;
  fragment?: string | null;
}

export interface ImportListBulkResource {
  ids?: number[] | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  enableAutomaticAdd?: boolean | null;
  rootFolderPath?: string | null;
  /** @format int32 */
  qualityProfileId?: number | null;
}

export interface ImportListExclusionResource {
  /** @format int32 */
  id?: number;
  foreignId?: string | null;
  artistName?: string | null;
}

export enum ImportListMonitorType {
  None = "none",
  SpecificAlbum = "specificAlbum",
  EntireArtist = "entireArtist",
}

export interface ImportListResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage;
  /** @uniqueItems true */
  tags?: number[] | null;
  presets?: ImportListResource[] | null;
  enableAutomaticAdd?: boolean;
  shouldMonitor?: ImportListMonitorType;
  shouldMonitorExisting?: boolean;
  shouldSearch?: boolean;
  rootFolderPath?: string | null;
  monitorNewItems?: NewItemMonitorTypes;
  /** @format int32 */
  qualityProfileId?: number;
  /** @format int32 */
  metadataProfileId?: number;
  listType?: ImportListType;
  /** @format int32 */
  listOrder?: number;
  /** @format date-span */
  minRefreshInterval?: string;
}

export enum ImportListType {
  Program = "program",
  Spotify = "spotify",
  LastFm = "lastFm",
  Other = "other",
  Advanced = "advanced",
}

export interface IndexerBulkResource {
  ids?: number[] | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  enableRss?: boolean | null;
  enableAutomaticSearch?: boolean | null;
  enableInteractiveSearch?: boolean | null;
  /** @format int32 */
  priority?: number | null;
}

export interface IndexerConfigResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  minimumAge?: number;
  /** @format int32 */
  maximumSize?: number;
  /** @format int32 */
  retention?: number;
  /** @format int32 */
  rssSyncInterval?: number;
}

export interface IndexerFlagResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  nameLower?: string | null;
}

export interface IndexerResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage;
  /** @uniqueItems true */
  tags?: number[] | null;
  presets?: IndexerResource[] | null;
  enableRss?: boolean;
  enableAutomaticSearch?: boolean;
  enableInteractiveSearch?: boolean;
  supportsRss?: boolean;
  supportsSearch?: boolean;
  protocol?: DownloadProtocol;
  /** @format int32 */
  priority?: number;
  /** @format int32 */
  downloadClientId?: number;
}

export interface IsoCountry {
  twoLetterCode?: string | null;
  name?: string | null;
}

export interface LanguageResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  nameLower?: string | null;
}

export interface Links {
  url?: string | null;
  name?: string | null;
}

export interface LocalizationResource {
  /** @format int32 */
  id?: number;
  strings?: Record<string, string | null>;
}

export interface LogFileResource {
  /** @format int32 */
  id?: number;
  filename?: string | null;
  /** @format date-time */
  lastWriteTime?: string;
  contentsUrl?: string | null;
  downloadUrl?: string | null;
}

export interface LogResource {
  /** @format int32 */
  id?: number;
  /** @format date-time */
  time?: string;
  exception?: string | null;
  exceptionType?: string | null;
  level?: string | null;
  logger?: string | null;
  message?: string | null;
  method?: string | null;
}

export interface LogResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: LogResource[] | null;
}

export interface ManualImportResource {
  /** @format int32 */
  id?: number;
  path?: string | null;
  name?: string | null;
  /** @format int64 */
  size?: number;
  artist?: ArtistResource;
  album?: AlbumResource;
  /** @format int32 */
  albumReleaseId?: number;
  tracks?: TrackResource[] | null;
  quality?: QualityModel;
  releaseGroup?: string | null;
  /** @format int32 */
  qualityWeight?: number;
  downloadId?: string | null;
  /** @format int32 */
  indexerFlags?: number;
  rejections?: Rejection[] | null;
  audioTags?: ParsedTrackInfo;
  additionalFile?: boolean;
  replaceExistingFiles?: boolean;
  disableReleaseSwitching?: boolean;
}

export interface ManualImportUpdateResource {
  /** @format int32 */
  id?: number;
  path?: string | null;
  name?: string | null;
  /** @format int32 */
  artistId?: number | null;
  /** @format int32 */
  albumId?: number | null;
  /** @format int32 */
  albumReleaseId?: number | null;
  tracks?: TrackResource[] | null;
  trackIds?: number[] | null;
  quality?: QualityModel;
  releaseGroup?: string | null;
  /** @format int32 */
  indexerFlags?: number;
  downloadId?: string | null;
  additionalFile?: boolean;
  replaceExistingFiles?: boolean;
  disableReleaseSwitching?: boolean;
  rejections?: Rejection[] | null;
}

export interface MediaCover {
  url?: string | null;
  coverType?: MediaCoverTypes;
  extension?: string | null;
  remoteUrl?: string | null;
}

export enum MediaCoverTypes {
  Unknown = "unknown",
  Poster = "poster",
  Banner = "banner",
  Fanart = "fanart",
  Screenshot = "screenshot",
  Headshot = "headshot",
  Cover = "cover",
  Disc = "disc",
  Logo = "logo",
  Clearlogo = "clearlogo",
}

export interface MediaInfoModel {
  audioFormat?: string | null;
  /** @format int32 */
  audioBitrate?: number;
  /** @format int32 */
  audioChannels?: number;
  /** @format int32 */
  audioBits?: number;
  /** @format int32 */
  audioSampleRate?: number;
}

export interface MediaInfoResource {
  /** @format int32 */
  id?: number;
  /** @format double */
  audioChannels?: number;
  audioBitRate?: string | null;
  audioCodec?: string | null;
  audioBits?: string | null;
  audioSampleRate?: string | null;
}

export interface MediaManagementConfigResource {
  /** @format int32 */
  id?: number;
  autoUnmonitorPreviouslyDownloadedTracks?: boolean;
  recycleBin?: string | null;
  /** @format int32 */
  recycleBinCleanupDays?: number;
  downloadPropersAndRepacks?: ProperDownloadTypes;
  createEmptyArtistFolders?: boolean;
  deleteEmptyFolders?: boolean;
  fileDate?: FileDateType;
  watchLibraryForChanges?: boolean;
  rescanAfterRefresh?: RescanAfterRefreshType;
  allowFingerprinting?: AllowFingerprinting;
  setPermissionsLinux?: boolean;
  chmodFolder?: string | null;
  chownGroup?: string | null;
  skipFreeSpaceCheckWhenImporting?: boolean;
  /** @format int32 */
  minimumFreeSpaceWhenImporting?: number;
  copyUsingHardlinks?: boolean;
  importExtraFiles?: boolean;
  extraFileExtensions?: string | null;
}

export interface MediumResource {
  /** @format int32 */
  mediumNumber?: number;
  mediumName?: string | null;
  mediumFormat?: string | null;
}

export interface Member {
  name?: string | null;
  instrument?: string | null;
  images?: MediaCover[] | null;
}

export interface MetadataProfileResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  primaryAlbumTypes?: ProfilePrimaryAlbumTypeItemResource[] | null;
  secondaryAlbumTypes?: ProfileSecondaryAlbumTypeItemResource[] | null;
  releaseStatuses?: ProfileReleaseStatusItemResource[] | null;
}

export interface MetadataProviderConfigResource {
  /** @format int32 */
  id?: number;
  metadataSource?: string | null;
  writeAudioTags?: WriteAudioTagsType;
  scrubAudioTags?: boolean;
  embedCoverArt?: boolean;
}

export interface MetadataResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage;
  /** @uniqueItems true */
  tags?: number[] | null;
  presets?: MetadataResource[] | null;
  enable?: boolean;
}

export enum MonitorTypes {
  All = "all",
  Future = "future",
  Missing = "missing",
  Existing = "existing",
  Latest = "latest",
  First = "first",
  None = "none",
  Unknown = "unknown",
}

export interface MonitoringOptions {
  monitor?: MonitorTypes;
  albumsToMonitor?: string[] | null;
  monitored?: boolean;
}

export interface NamingConfigResource {
  /** @format int32 */
  id?: number;
  renameTracks?: boolean;
  replaceIllegalCharacters?: boolean;
  /** @format int32 */
  colonReplacementFormat?: number;
  standardTrackFormat?: string | null;
  multiDiscTrackFormat?: string | null;
  artistFolderFormat?: string | null;
  includeArtistName?: boolean;
  includeAlbumTitle?: boolean;
  includeQuality?: boolean;
  replaceSpaces?: boolean;
  separator?: string | null;
  numberStyle?: string | null;
}

export enum NewItemMonitorTypes {
  All = "all",
  None = "none",
  New = "new",
}

export interface NotificationResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage;
  /** @uniqueItems true */
  tags?: number[] | null;
  presets?: NotificationResource[] | null;
  link?: string | null;
  onGrab?: boolean;
  onReleaseImport?: boolean;
  onUpgrade?: boolean;
  onRename?: boolean;
  onArtistAdd?: boolean;
  onArtistDelete?: boolean;
  onAlbumDelete?: boolean;
  onHealthIssue?: boolean;
  onHealthRestored?: boolean;
  onDownloadFailure?: boolean;
  onImportFailure?: boolean;
  onTrackRetag?: boolean;
  onApplicationUpdate?: boolean;
  supportsOnGrab?: boolean;
  supportsOnReleaseImport?: boolean;
  supportsOnUpgrade?: boolean;
  supportsOnRename?: boolean;
  supportsOnArtistAdd?: boolean;
  supportsOnArtistDelete?: boolean;
  supportsOnAlbumDelete?: boolean;
  supportsOnHealthIssue?: boolean;
  supportsOnHealthRestored?: boolean;
  includeHealthWarnings?: boolean;
  supportsOnDownloadFailure?: boolean;
  supportsOnImportFailure?: boolean;
  supportsOnTrackRetag?: boolean;
  supportsOnApplicationUpdate?: boolean;
  testCommand?: string | null;
}

export interface ParseResource {
  /** @format int32 */
  id?: number;
  title?: string | null;
  parsedAlbumInfo?: ParsedAlbumInfo;
  artist?: ArtistResource;
  albums?: AlbumResource[] | null;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
}

export interface ParsedAlbumInfo {
  releaseTitle?: string | null;
  albumTitle?: string | null;
  artistName?: string | null;
  albumType?: string | null;
  artistTitleInfo?: ArtistTitleInfo;
  quality?: QualityModel;
  releaseDate?: string | null;
  discography?: boolean;
  /** @format int32 */
  discographyStart?: number;
  /** @format int32 */
  discographyEnd?: number;
  releaseGroup?: string | null;
  releaseHash?: string | null;
  releaseVersion?: string | null;
}

export interface ParsedTrackInfo {
  title?: string | null;
  cleanTitle?: string | null;
  artistTitle?: string | null;
  albumTitle?: string | null;
  artistTitleInfo?: ArtistTitleInfo;
  artistMBId?: string | null;
  albumMBId?: string | null;
  releaseMBId?: string | null;
  recordingMBId?: string | null;
  trackMBId?: string | null;
  /** @format int32 */
  discNumber?: number;
  /** @format int32 */
  discCount?: number;
  country?: IsoCountry;
  /** @format int32 */
  year?: number;
  label?: string | null;
  catalogNumber?: string | null;
  disambiguation?: string | null;
  /** @format date-span */
  duration?: string;
  quality?: QualityModel;
  mediaInfo?: MediaInfoModel;
  trackNumbers?: number[] | null;
  releaseGroup?: string | null;
  releaseHash?: string | null;
}

export interface PingResource {
  status?: string | null;
}

export interface PrimaryAlbumType {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export enum PrivacyLevel {
  Normal = "normal",
  Password = "password",
  ApiKey = "apiKey",
  UserName = "userName",
}

export interface ProfileFormatItemResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  format?: number;
  name?: string | null;
  /** @format int32 */
  score?: number;
}

export interface ProfilePrimaryAlbumTypeItemResource {
  /** @format int32 */
  id?: number;
  albumType?: PrimaryAlbumType;
  allowed?: boolean;
}

export interface ProfileReleaseStatusItemResource {
  /** @format int32 */
  id?: number;
  releaseStatus?: ReleaseStatus;
  allowed?: boolean;
}

export interface ProfileSecondaryAlbumTypeItemResource {
  /** @format int32 */
  id?: number;
  albumType?: SecondaryAlbumType;
  allowed?: boolean;
}

export enum ProperDownloadTypes {
  PreferAndUpgrade = "preferAndUpgrade",
  DoNotUpgrade = "doNotUpgrade",
  DoNotPrefer = "doNotPrefer",
}

export interface ProviderMessage {
  message?: string | null;
  type?: ProviderMessageType;
}

export enum ProviderMessageType {
  Info = "info",
  Warning = "warning",
  Error = "error",
}

export enum ProxyType {
  Http = "http",
  Socks4 = "socks4",
  Socks5 = "socks5",
}

export interface Quality {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export interface QualityDefinitionResource {
  /** @format int32 */
  id?: number;
  quality?: Quality;
  title?: string | null;
  /** @format int32 */
  weight?: number;
  /** @format double */
  minSize?: number | null;
  /** @format double */
  maxSize?: number | null;
  /** @format double */
  preferredSize?: number | null;
}

export interface QualityModel {
  quality?: Quality;
  revision?: Revision;
}

export interface QualityProfileQualityItemResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  quality?: Quality;
  items?: QualityProfileQualityItemResource[] | null;
  allowed?: boolean;
}

export interface QualityProfileResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  upgradeAllowed?: boolean;
  /** @format int32 */
  cutoff?: number;
  items?: QualityProfileQualityItemResource[] | null;
  /** @format int32 */
  minFormatScore?: number;
  /** @format int32 */
  cutoffFormatScore?: number;
  formatItems?: ProfileFormatItemResource[] | null;
}

export interface QueueBulkResource {
  ids?: number[] | null;
}

export interface QueueResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  artistId?: number | null;
  /** @format int32 */
  albumId?: number | null;
  artist?: ArtistResource;
  album?: AlbumResource;
  quality?: QualityModel;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  /** @format double */
  size?: number;
  title?: string | null;
  /** @format double */
  sizeleft?: number;
  /** @format date-span */
  timeleft?: string | null;
  /** @format date-time */
  estimatedCompletionTime?: string | null;
  /** @format date-time */
  added?: string | null;
  status?: string | null;
  trackedDownloadStatus?: TrackedDownloadStatus;
  trackedDownloadState?: TrackedDownloadState;
  statusMessages?: TrackedDownloadStatusMessage[] | null;
  errorMessage?: string | null;
  downloadId?: string | null;
  protocol?: DownloadProtocol;
  downloadClient?: string | null;
  downloadClientHasPostImportCategory?: boolean;
  indexer?: string | null;
  outputPath?: string | null;
  /** @format int32 */
  trackFileCount?: number;
  /** @format int32 */
  trackHasFileCount?: number;
  downloadForced?: boolean;
}

export interface QueueResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: QueueResource[] | null;
}

export interface QueueStatusResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  totalCount?: number;
  /** @format int32 */
  count?: number;
  /** @format int32 */
  unknownCount?: number;
  errors?: boolean;
  warnings?: boolean;
  unknownErrors?: boolean;
  unknownWarnings?: boolean;
}

export interface Ratings {
  /** @format int32 */
  votes?: number;
  /** @format double */
  value?: number;
}

export interface Rejection {
  reason?: string | null;
  type?: RejectionType;
}

export enum RejectionType {
  Permanent = "permanent",
  Temporary = "temporary",
}

export interface ReleaseProfileResource {
  /** @format int32 */
  id?: number;
  enabled?: boolean;
  required?: string[] | null;
  ignored?: string[] | null;
  /** @format int32 */
  indexerId?: number;
  /** @uniqueItems true */
  tags?: number[] | null;
}

export interface ReleaseResource {
  /** @format int32 */
  id?: number;
  guid?: string | null;
  quality?: QualityModel;
  /** @format int32 */
  qualityWeight?: number;
  /** @format int32 */
  age?: number;
  /** @format double */
  ageHours?: number;
  /** @format double */
  ageMinutes?: number;
  /** @format int64 */
  size?: number;
  /** @format int32 */
  indexerId?: number;
  indexer?: string | null;
  releaseGroup?: string | null;
  subGroup?: string | null;
  releaseHash?: string | null;
  title?: string | null;
  discography?: boolean;
  sceneSource?: boolean;
  airDate?: string | null;
  artistName?: string | null;
  albumTitle?: string | null;
  approved?: boolean;
  temporarilyRejected?: boolean;
  rejected?: boolean;
  rejections?: string[] | null;
  /** @format date-time */
  publishDate?: string;
  commentUrl?: string | null;
  downloadUrl?: string | null;
  infoUrl?: string | null;
  downloadAllowed?: boolean;
  /** @format int32 */
  releaseWeight?: number;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  magnetUrl?: string | null;
  infoHash?: string | null;
  /** @format int32 */
  seeders?: number | null;
  /** @format int32 */
  leechers?: number | null;
  protocol?: DownloadProtocol;
  /** @format int32 */
  indexerFlags?: number;
  /** @format int32 */
  artistId?: number | null;
  /** @format int32 */
  albumId?: number | null;
  /** @format int32 */
  downloadClientId?: number | null;
  downloadClient?: string | null;
}

export interface ReleaseStatus {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export interface RemotePathMappingResource {
  /** @format int32 */
  id?: number;
  host?: string | null;
  remotePath?: string | null;
  localPath?: string | null;
}

export interface RenameTrackResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  artistId?: number;
  /** @format int32 */
  albumId?: number;
  trackNumbers?: number[] | null;
  /** @format int32 */
  trackFileId?: number;
  existingPath?: string | null;
  newPath?: string | null;
}

export enum RescanAfterRefreshType {
  Always = "always",
  AfterManual = "afterManual",
  Never = "never",
}

export interface RetagTrackResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  artistId?: number;
  /** @format int32 */
  albumId?: number;
  trackNumbers?: number[] | null;
  /** @format int32 */
  trackFileId?: number;
  path?: string | null;
  changes?: TagDifference[] | null;
}

export interface Revision {
  /** @format int32 */
  version?: number;
  /** @format int32 */
  real?: number;
  isRepack?: boolean;
}

export interface RootFolderResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  path?: string | null;
  /** @format int32 */
  defaultMetadataProfileId?: number;
  /** @format int32 */
  defaultQualityProfileId?: number;
  defaultMonitorOption?: MonitorTypes;
  defaultNewItemMonitorOption?: NewItemMonitorTypes;
  /** @uniqueItems true */
  defaultTags?: number[] | null;
  accessible?: boolean;
  /** @format int64 */
  freeSpace?: number | null;
  /** @format int64 */
  totalSpace?: number | null;
}

export enum RuntimeMode {
  Console = "console",
  Service = "service",
  Tray = "tray",
}

export interface SearchResource {
  /** @format int32 */
  id?: number;
  foreignId?: string | null;
  artist?: ArtistResource;
  album?: AlbumResource;
}

export interface SecondaryAlbumType {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export interface SelectOption {
  /** @format int32 */
  value?: number;
  name?: string | null;
  /** @format int32 */
  order?: number;
  hint?: string | null;
}

export enum SortDirection {
  Default = "default",
  Ascending = "ascending",
  Descending = "descending",
}

export interface SystemResource {
  appName?: string | null;
  instanceName?: string | null;
  version?: string | null;
  /** @format date-time */
  buildTime?: string;
  isDebug?: boolean;
  isProduction?: boolean;
  isAdmin?: boolean;
  isUserInteractive?: boolean;
  startupPath?: string | null;
  appData?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  isNetCore?: boolean;
  isLinux?: boolean;
  isOsx?: boolean;
  isWindows?: boolean;
  isDocker?: boolean;
  mode?: RuntimeMode;
  branch?: string | null;
  databaseType?: DatabaseType;
  databaseVersion?: string | null;
  authentication?: AuthenticationType;
  /** @format int32 */
  migrationVersion?: number;
  urlBase?: string | null;
  runtimeVersion?: string | null;
  runtimeName?: string | null;
  /** @format date-time */
  startTime?: string;
  packageVersion?: string | null;
  packageAuthor?: string | null;
  packageUpdateMechanism?: UpdateMechanism;
  packageUpdateMechanismMessage?: string | null;
}

export interface TagDetailsResource {
  /** @format int32 */
  id?: number;
  label?: string | null;
  delayProfileIds?: number[] | null;
  importListIds?: number[] | null;
  notificationIds?: number[] | null;
  restrictionIds?: number[] | null;
  indexerIds?: number[] | null;
  downloadClientIds?: number[] | null;
  autoTagIds?: number[] | null;
  artistIds?: number[] | null;
}

export interface TagDifference {
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface TagResource {
  /** @format int32 */
  id?: number;
  label?: string | null;
}

export interface TaskResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  taskName?: string | null;
  /** @format int32 */
  interval?: number;
  /** @format date-time */
  lastExecution?: string;
  /** @format date-time */
  lastStartTime?: string;
  /** @format date-time */
  nextExecution?: string;
  /** @format date-span */
  lastDuration?: string;
}

export interface TrackFileListResource {
  trackFileIds?: number[] | null;
  quality?: QualityModel;
  sceneName?: string | null;
  releaseGroup?: string | null;
}

export interface TrackFileResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  artistId?: number;
  /** @format int32 */
  albumId?: number;
  path?: string | null;
  /** @format int64 */
  size?: number;
  /** @format date-time */
  dateAdded?: string;
  sceneName?: string | null;
  releaseGroup?: string | null;
  quality?: QualityModel;
  /** @format int32 */
  qualityWeight?: number;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  /** @format int32 */
  indexerFlags?: number | null;
  mediaInfo?: MediaInfoResource;
  qualityCutoffNotMet?: boolean;
  audioTags?: ParsedTrackInfo;
}

export interface TrackResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  artistId?: number;
  foreignTrackId?: string | null;
  foreignRecordingId?: string | null;
  /** @format int32 */
  trackFileId?: number;
  /** @format int32 */
  albumId?: number;
  explicit?: boolean;
  /** @format int32 */
  absoluteTrackNumber?: number;
  trackNumber?: string | null;
  title?: string | null;
  /** @format int32 */
  duration?: number;
  trackFile?: TrackFileResource;
  /** @format int32 */
  mediumNumber?: number;
  hasFile?: boolean;
  artist?: ArtistResource;
  ratings?: Ratings;
}

export enum TrackedDownloadState {
  Downloading = "downloading",
  DownloadFailed = "downloadFailed",
  DownloadFailedPending = "downloadFailedPending",
  ImportPending = "importPending",
  Importing = "importing",
  ImportFailed = "importFailed",
  Imported = "imported",
  Ignored = "ignored",
}

export enum TrackedDownloadStatus {
  Ok = "ok",
  Warning = "warning",
  Error = "error",
}

export interface TrackedDownloadStatusMessage {
  title?: string | null;
  messages?: string[] | null;
}

export interface UiConfigResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  firstDayOfWeek?: number;
  calendarWeekColumnHeader?: string | null;
  shortDateFormat?: string | null;
  longDateFormat?: string | null;
  timeFormat?: string | null;
  showRelativeDates?: boolean;
  enableColorImpairedMode?: boolean;
  /** @format int32 */
  uiLanguage?: number;
  expandAlbumByDefault?: boolean;
  expandSingleByDefault?: boolean;
  expandEPByDefault?: boolean;
  expandBroadcastByDefault?: boolean;
  expandOtherByDefault?: boolean;
  theme?: string | null;
}

export interface UpdateChanges {
  new?: string[] | null;
  fixed?: string[] | null;
}

export enum UpdateMechanism {
  BuiltIn = "builtIn",
  Script = "script",
  External = "external",
  Apt = "apt",
  Docker = "docker",
}

export interface UpdateResource {
  /** @format int32 */
  id?: number;
  version?: string | null;
  branch?: string | null;
  /** @format date-time */
  releaseDate?: string;
  fileName?: string | null;
  url?: string | null;
  installed?: boolean;
  /** @format date-time */
  installedOn?: string | null;
  installable?: boolean;
  latest?: boolean;
  changes?: UpdateChanges;
  hash?: string | null;
}

export enum WriteAudioTagsType {
  No = "no",
  NewFiles = "newFiles",
  AllFiles = "allFiles",
  Sync = "sync",
}
