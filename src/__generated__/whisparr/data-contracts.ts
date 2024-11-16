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

export interface Actor {
  /** @format int32 */
  tpdbId?: number;
  name?: string | null;
  character?: string | null;
  gender?: Gender;
  images?: MediaCover[] | null;
}

export interface AddSeriesOptions {
  ignoreEpisodesWithFiles?: boolean;
  ignoreEpisodesWithoutFiles?: boolean;
  episodesToMonitor?: number[] | null;
  monitor?: MonitorTypes;
  searchForMissingEpisodes?: boolean;
  searchForCutoffUnmetEpisodes?: boolean;
}

export enum ApplyTags {
  Add = "add",
  Remove = "remove",
  Replace = "replace",
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
  seriesId?: number;
  episodeIds?: number[] | null;
  sourceTitle?: string | null;
  languages?: Language[] | null;
  quality?: QualityModel;
  customFormats?: CustomFormatResource[] | null;
  /** @format date-time */
  date?: string;
  protocol?: DownloadProtocol;
  indexer?: string | null;
  message?: string | null;
  series?: SeriesResource;
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
  duration?: TimeSpan;
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

export interface DateOnly {
  /** @format int32 */
  year?: number;
  /** @format int32 */
  month?: number;
  /** @format int32 */
  day?: number;
  dayOfWeek?: DayOfWeek;
  /** @format int32 */
  dayOfYear?: number;
  /** @format int32 */
  dayNumber?: number;
}

export enum DayOfWeek {
  Sunday = "sunday",
  Monday = "monday",
  Tuesday = "tuesday",
  Wednesday = "wednesday",
  Thursday = "thursday",
  Friday = "friday",
  Saturday = "saturday",
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

export interface EpisodeFileListResource {
  episodeFileIds?: number[] | null;
  languages?: Language[] | null;
  quality?: QualityModel;
  sceneName?: string | null;
  releaseGroup?: string | null;
}

export interface EpisodeFileResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  seriesId?: number;
  /** @format int32 */
  seasonNumber?: number;
  relativePath?: string | null;
  path?: string | null;
  /** @format int64 */
  size?: number;
  /** @format date-time */
  dateAdded?: string;
  sceneName?: string | null;
  releaseGroup?: string | null;
  languages?: Language[] | null;
  quality?: QualityModel;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  mediaInfo?: MediaInfoResource;
  qualityCutoffNotMet?: boolean;
}

export enum EpisodeHistoryEventType {
  Unknown = "unknown",
  Grabbed = "grabbed",
  SeriesFolderImported = "seriesFolderImported",
  DownloadFolderImported = "downloadFolderImported",
  DownloadFailed = "downloadFailed",
  EpisodeFileDeleted = "episodeFileDeleted",
  EpisodeFileRenamed = "episodeFileRenamed",
  DownloadIgnored = "downloadIgnored",
}

export interface EpisodeResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  seriesId?: number;
  /** @format int32 */
  tvdbId?: number;
  /** @format int32 */
  episodeFileId?: number;
  /** @format int32 */
  seasonNumber?: number;
  title?: string | null;
  releaseDate?: DateOnly;
  /** @format int32 */
  runtime?: number;
  overview?: string | null;
  episodeFile?: EpisodeFileResource;
  hasFile?: boolean;
  monitored?: boolean;
  /** @format int32 */
  absoluteEpisodeNumber?: number | null;
  /** @format date-time */
  endTime?: string | null;
  /** @format date-time */
  grabDate?: string | null;
  seriesTitle?: string | null;
  series?: SeriesResource;
  actors?: Actor[] | null;
  images?: MediaCover[] | null;
  grabbed?: boolean;
}

export interface EpisodeResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: EpisodeResource[] | null;
}

export enum EpisodeTitleRequiredType {
  Always = "always",
  BulkSeasonReleases = "bulkSeasonReleases",
  Never = "never",
}

export interface EpisodesMonitoredResource {
  episodeIds?: number[] | null;
  monitored?: boolean;
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
  LocalAirDate = "localAirDate",
  UtcAirDate = "utcAirDate",
}

export enum Gender {
  Female = "female",
  Male = "male",
  Other = "other",
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
  episodeId?: number;
  /** @format int32 */
  seriesId?: number;
  sourceTitle?: string | null;
  languages?: Language[] | null;
  quality?: QualityModel;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  qualityCutoffNotMet?: boolean;
  /** @format date-time */
  date?: string;
  downloadId?: string | null;
  eventType?: EpisodeHistoryEventType;
  data?: Record<string, string | null>;
  episode?: EpisodeResource;
  series?: SeriesResource;
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
  logLevel?: string | null;
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
  /** @format int32 */
  tvdbId?: number;
  title?: string | null;
}

export enum ImportListMonitorTypes {
  None = "none",
  SpecificEpisode = "specificEpisode",
  EntireSite = "entireSite",
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
  shouldMonitor?: ImportListMonitorTypes;
  siteMonitorType?: MonitorTypes;
  rootFolderPath?: string | null;
  /** @format int32 */
  qualityProfileId?: number;
  listType?: ImportListType;
  /** @format int32 */
  listOrder?: number;
  minRefreshInterval?: TimeSpan;
}

export enum ImportListType {
  Program = "program",
  Plex = "plex",
  Trakt = "trakt",
  Simkl = "simkl",
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
  retention?: number;
  /** @format int32 */
  maximumSize?: number;
  /** @format int32 */
  rssSyncInterval?: number;
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
  seasonSearchMaximumSingleEpisodeAge?: number;
  /** @format int32 */
  downloadClientId?: number;
}

export interface Language {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export interface LanguageProfileItemResource {
  /** @format int32 */
  id?: number;
  language?: Language;
  allowed?: boolean;
}

export interface LanguageProfileResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  upgradeAllowed?: boolean;
  cutoff?: Language;
  languages?: LanguageProfileItemResource[] | null;
}

export interface LanguageResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  nameLower?: string | null;
}

export interface LocalizationLanguageResource {
  identifier?: string | null;
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

export interface ManualImportReprocessResource {
  /** @format int32 */
  id?: number;
  path?: string | null;
  /** @format int32 */
  seriesId?: number;
  /** @format int32 */
  seasonNumber?: number | null;
  episodes?: EpisodeResource[] | null;
  episodeIds?: number[] | null;
  quality?: QualityModel;
  languages?: Language[] | null;
  releaseGroup?: string | null;
  downloadId?: string | null;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  rejections?: Rejection[] | null;
}

export interface ManualImportResource {
  /** @format int32 */
  id?: number;
  path?: string | null;
  relativePath?: string | null;
  folderName?: string | null;
  name?: string | null;
  /** @format int64 */
  size?: number;
  series?: SeriesResource;
  /** @format int32 */
  seasonNumber?: number | null;
  episodes?: EpisodeResource[] | null;
  /** @format int32 */
  episodeFileId?: number | null;
  releaseGroup?: string | null;
  quality?: QualityModel;
  languages?: Language[] | null;
  /** @format int32 */
  qualityWeight?: number;
  downloadId?: string | null;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  rejections?: Rejection[] | null;
}

export interface MediaCover {
  coverType?: MediaCoverTypes;
  url?: string | null;
  remoteUrl?: string | null;
}

export enum MediaCoverTypes {
  Unknown = "unknown",
  Logo = "logo",
  Poster = "poster",
  Banner = "banner",
  Fanart = "fanart",
  Screenshot = "screenshot",
  Headshot = "headshot",
  Clearlogo = "clearlogo",
}

export interface MediaInfoResource {
  /** @format int32 */
  id?: number;
  /** @format int64 */
  audioBitrate?: number;
  /** @format double */
  audioChannels?: number;
  audioCodec?: string | null;
  audioLanguages?: string | null;
  /** @format int32 */
  audioStreamCount?: number;
  /** @format int32 */
  videoBitDepth?: number;
  /** @format int64 */
  videoBitrate?: number;
  videoCodec?: string | null;
  /** @format double */
  videoFps?: number;
  videoDynamicRange?: string | null;
  videoDynamicRangeType?: string | null;
  resolution?: string | null;
  runTime?: string | null;
  scanType?: string | null;
  subtitles?: string | null;
}

export interface MediaManagementConfigResource {
  /** @format int32 */
  id?: number;
  autoUnmonitorPreviouslyDownloadedEpisodes?: boolean;
  recycleBin?: string | null;
  /** @format int32 */
  recycleBinCleanupDays?: number;
  downloadPropersAndRepacks?: ProperDownloadTypes;
  createEmptySeriesFolders?: boolean;
  deleteEmptyFolders?: boolean;
  fileDate?: FileDateType;
  rescanAfterRefresh?: RescanAfterRefreshType;
  setPermissionsLinux?: boolean;
  chmodFolder?: string | null;
  chownGroup?: string | null;
  episodeTitleRequired?: EpisodeTitleRequiredType;
  skipFreeSpaceCheckWhenImporting?: boolean;
  /** @format int32 */
  minimumFreeSpaceWhenImporting?: number;
  copyUsingHardlinks?: boolean;
  useScriptImport?: boolean;
  scriptImportPath?: string | null;
  importExtraFiles?: boolean;
  extraFileExtensions?: string | null;
  enableMediaInfo?: boolean;
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
  Unknown = "unknown",
  All = "all",
  Future = "future",
  Missing = "missing",
  Existing = "existing",
  FirstSeason = "firstSeason",
  LatestSeason = "latestSeason",
  None = "none",
}

export interface MonitoringOptions {
  ignoreEpisodesWithFiles?: boolean;
  ignoreEpisodesWithoutFiles?: boolean;
  episodesToMonitor?: number[] | null;
  monitor?: MonitorTypes;
}

export interface NamingConfigResource {
  /** @format int32 */
  id?: number;
  renameEpisodes?: boolean;
  replaceIllegalCharacters?: boolean;
  /** @format int32 */
  colonReplacementFormat?: number;
  /** @format int32 */
  multiEpisodeStyle?: number;
  standardEpisodeFormat?: string | null;
  seriesFolderFormat?: string | null;
  includeSeriesTitle?: boolean;
  includeEpisodeTitle?: boolean;
  includeQuality?: boolean;
  replaceSpaces?: boolean;
  separator?: string | null;
  numberStyle?: string | null;
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
  onDownload?: boolean;
  onUpgrade?: boolean;
  onRename?: boolean;
  onSeriesAdd?: boolean;
  onSeriesDelete?: boolean;
  onEpisodeFileDelete?: boolean;
  onEpisodeFileDeleteForUpgrade?: boolean;
  onHealthIssue?: boolean;
  onHealthRestored?: boolean;
  onApplicationUpdate?: boolean;
  onManualInteractionRequired?: boolean;
  supportsOnGrab?: boolean;
  supportsOnDownload?: boolean;
  supportsOnUpgrade?: boolean;
  supportsOnRename?: boolean;
  supportsOnSeriesAdd?: boolean;
  supportsOnSeriesDelete?: boolean;
  supportsOnEpisodeFileDelete?: boolean;
  supportsOnEpisodeFileDeleteForUpgrade?: boolean;
  supportsOnHealthIssue?: boolean;
  supportsOnHealthRestored?: boolean;
  supportsOnApplicationUpdate?: boolean;
  supportsOnManualInteractionRequired?: boolean;
  includeHealthWarnings?: boolean;
  testCommand?: string | null;
}

export interface ParseResource {
  /** @format int32 */
  id?: number;
  title?: string | null;
  parsedEpisodeInfo?: ParsedEpisodeInfo;
  series?: SeriesResource;
  episodes?: EpisodeResource[] | null;
  languages?: Language[] | null;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
}

export interface ParsedEpisodeInfo {
  releaseTitle?: string | null;
  seriesTitle?: string | null;
  seriesTitleInfo?: SeriesTitleInfo;
  quality?: QualityModel;
  airDate?: string | null;
  languages?: Language[] | null;
  releaseGroup?: string | null;
  releaseHash?: string | null;
  /** @format int32 */
  seasonPart?: number;
  releaseTokens?: string | null;
  isDaily?: boolean;
}

export interface PingResource {
  status?: string | null;
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
  source?: QualitySource;
  /** @format int32 */
  resolution?: number;
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

export enum QualitySource {
  Unknown = "unknown",
  Television = "television",
  TelevisionRaw = "televisionRaw",
  Web = "web",
  WebRip = "webRip",
  Dvd = "dvd",
  Bluray = "bluray",
  Vr = "vr",
  BlurayRaw = "blurayRaw",
}

export interface QueueBulkResource {
  ids?: number[] | null;
}

export interface QueueResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  seriesId?: number | null;
  /** @format int32 */
  episodeId?: number | null;
  /** @format int32 */
  seasonNumber?: number | null;
  series?: SeriesResource;
  episode?: EpisodeResource;
  languages?: Language[] | null;
  quality?: QualityModel;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  /** @format double */
  size?: number;
  title?: string | null;
  /** @format double */
  sizeleft?: number;
  timeleft?: TimeSpan;
  /** @format date-time */
  estimatedCompletionTime?: string | null;
  status?: string | null;
  trackedDownloadStatus?: TrackedDownloadStatus;
  trackedDownloadState?: TrackedDownloadState;
  statusMessages?: TrackedDownloadStatusMessage[] | null;
  errorMessage?: string | null;
  downloadId?: string | null;
  protocol?: DownloadProtocol;
  downloadClient?: string | null;
  indexer?: string | null;
  outputPath?: string | null;
  episodeHasFile?: boolean;
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

export interface ReleaseEpisodeResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  seasonNumber?: number;
  /** @format int32 */
  episodeNumber?: number;
  /** @format int32 */
  absoluteEpisodeNumber?: number | null;
  title?: string | null;
}

export interface ReleaseProfileResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  enabled?: boolean;
  required?: any;
  ignored?: any;
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
  sceneSource?: boolean;
  languages?: Language[] | null;
  /** @format int32 */
  languageWeight?: number;
  airDate?: string | null;
  seriesTitle?: string | null;
  /** @format int32 */
  mappedSeriesId?: number | null;
  mappedEpisodeInfo?: ReleaseEpisodeResource[] | null;
  approved?: boolean;
  temporarilyRejected?: boolean;
  rejected?: boolean;
  /** @format int32 */
  tvdbId?: number;
  rejections?: string[] | null;
  /** @format date-time */
  publishDate?: string;
  commentUrl?: string | null;
  downloadUrl?: string | null;
  infoUrl?: string | null;
  episodeRequested?: boolean;
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
  isDaily?: boolean;
  /** @format int32 */
  seriesId?: number | null;
  /** @format int32 */
  episodeId?: number | null;
  episodeIds?: number[] | null;
  /** @format int32 */
  downloadClientId?: number | null;
  shouldOverride?: boolean | null;
}

export interface RemotePathMappingResource {
  /** @format int32 */
  id?: number;
  host?: string | null;
  remotePath?: string | null;
  localPath?: string | null;
}

export interface RenameEpisodeResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  seriesId?: number;
  /** @format int32 */
  seasonNumber?: number;
  releaseDates?: string[] | null;
  /** @format int32 */
  episodeFileId?: number;
  existingPath?: string | null;
  newPath?: string | null;
}

export enum RescanAfterRefreshType {
  Always = "always",
  AfterManual = "afterManual",
  Never = "never",
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
  path?: string | null;
  accessible?: boolean;
  /** @format int64 */
  freeSpace?: number | null;
  unmappedFolders?: UnmappedFolder[] | null;
}

export enum RuntimeMode {
  Console = "console",
  Service = "service",
  Tray = "tray",
}

export interface SeasonPassResource {
  series?: SeasonPassSeriesResource[] | null;
  monitoringOptions?: MonitoringOptions;
}

export interface SeasonPassSeriesResource {
  /** @format int32 */
  id?: number;
  monitored?: boolean | null;
  seasons?: SeasonResource[] | null;
}

export interface SeasonResource {
  /** @format int32 */
  seasonNumber?: number;
  monitored?: boolean;
  statistics?: SeasonStatisticsResource;
  images?: MediaCover[] | null;
}

export interface SeasonStatisticsResource {
  /** @format date-time */
  nextAiring?: string | null;
  /** @format date-time */
  previousAiring?: string | null;
  /** @format int32 */
  episodeFileCount?: number;
  /** @format int32 */
  episodeCount?: number;
  /** @format int32 */
  totalEpisodeCount?: number;
  /** @format int64 */
  sizeOnDisk?: number;
  releaseGroups?: string[] | null;
  /** @format double */
  percentOfEpisodes?: number;
}

export interface SelectOption {
  /** @format int32 */
  value?: number;
  name?: string | null;
  /** @format int32 */
  order?: number;
  hint?: string | null;
}

export interface SeriesEditorResource {
  seriesIds?: number[] | null;
  monitored?: boolean | null;
  /** @format int32 */
  qualityProfileId?: number | null;
  rootFolderPath?: string | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  moveFiles?: boolean;
  deleteFiles?: boolean;
  addImportListExclusion?: boolean;
}

export interface SeriesResource {
  /** @format int32 */
  id?: number;
  title?: string | null;
  sortTitle?: string | null;
  status?: SeriesStatusType;
  ended?: boolean;
  profileName?: string | null;
  overview?: string | null;
  /** @format date-time */
  nextAiring?: string | null;
  /** @format date-time */
  previousAiring?: string | null;
  network?: string | null;
  images?: MediaCover[] | null;
  originalLanguage?: Language;
  remotePoster?: string | null;
  seasons?: SeasonResource[] | null;
  /** @format int32 */
  year?: number;
  path?: string | null;
  /** @format int32 */
  qualityProfileId?: number;
  monitored?: boolean;
  useSceneNumbering?: boolean;
  /** @format int32 */
  runtime?: number;
  /** @format int32 */
  tvdbId?: number;
  /** @format date-time */
  firstAired?: string | null;
  cleanTitle?: string | null;
  titleSlug?: string | null;
  rootFolderPath?: string | null;
  folder?: string | null;
  certification?: string | null;
  genres?: string[] | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  /** @format date-time */
  added?: string;
  addOptions?: AddSeriesOptions;
  ratings?: Ratings;
  statistics?: SeriesStatisticsResource;
  episodesChanged?: boolean | null;
}

export interface SeriesStatisticsResource {
  /** @format int32 */
  seasonCount?: number;
  /** @format int32 */
  episodeFileCount?: number;
  /** @format int32 */
  episodeCount?: number;
  /** @format int32 */
  totalEpisodeCount?: number;
  /** @format int64 */
  sizeOnDisk?: number;
  releaseGroups?: string[] | null;
  /** @format double */
  percentOfEpisodes?: number;
}

export enum SeriesStatusType {
  Continuing = "continuing",
  Ended = "ended",
  Upcoming = "upcoming",
  Deleted = "deleted",
}

export interface SeriesTitleInfo {
  title?: string | null;
  titleWithoutYear?: string | null;
  /** @format int32 */
  year?: number;
  allTitles?: string[] | null;
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
  authentication?: AuthenticationType;
  sqliteVersion?: Version;
  /** @format int32 */
  migrationVersion?: number;
  urlBase?: string | null;
  runtimeVersion?: Version;
  runtimeName?: string | null;
  /** @format date-time */
  startTime?: string;
  packageVersion?: string | null;
  packageAuthor?: string | null;
  packageUpdateMechanism?: UpdateMechanism;
  packageUpdateMechanismMessage?: string | null;
  databaseVersion?: Version;
  databaseType?: DatabaseType;
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
  seriesIds?: number[] | null;
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
  lastDuration?: TimeSpan;
}

export interface TimeSpan {
  /** @format int64 */
  ticks?: number;
  /** @format int32 */
  days?: number;
  /** @format int32 */
  hours?: number;
  /** @format int32 */
  milliseconds?: number;
  /** @format int32 */
  minutes?: number;
  /** @format int32 */
  seconds?: number;
  /** @format double */
  totalDays?: number;
  /** @format double */
  totalHours?: number;
  /** @format double */
  totalMilliseconds?: number;
  /** @format double */
  totalMinutes?: number;
  /** @format double */
  totalSeconds?: number;
}

export enum TrackedDownloadState {
  Downloading = "downloading",
  ImportPending = "importPending",
  Importing = "importing",
  Imported = "imported",
  FailedPending = "failedPending",
  Failed = "failed",
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
  theme?: string | null;
  /** @format int32 */
  uiLanguage?: number;
}

export interface UnmappedFolder {
  name?: string | null;
  path?: string | null;
  relativePath?: string | null;
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
  version?: Version;
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

export interface Version {
  /** @format int32 */
  major?: number;
  /** @format int32 */
  minor?: number;
  /** @format int32 */
  build?: number;
  /** @format int32 */
  revision?: number;
  /** @format int32 */
  majorRevision?: number;
  /** @format int32 */
  minorRevision?: number;
}
