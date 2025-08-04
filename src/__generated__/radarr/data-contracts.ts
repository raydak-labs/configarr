/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export enum UpdateMechanism {
  BuiltIn = "builtIn",
  Script = "script",
  External = "external",
  Apt = "apt",
  Docker = "docker",
}

export enum TrackedDownloadStatus {
  Ok = "ok",
  Warning = "warning",
  Error = "error",
}

export enum TrackedDownloadState {
  Downloading = "downloading",
  ImportBlocked = "importBlocked",
  ImportPending = "importPending",
  Importing = "importing",
  Imported = "imported",
  FailedPending = "failedPending",
  Failed = "failed",
  Ignored = "ignored",
}

export enum TMDbCountryCode {
  Au = "au",
  Br = "br",
  Ca = "ca",
  Fr = "fr",
  De = "de",
  Gb = "gb",
  In = "in",
  Ie = "ie",
  It = "it",
  Nz = "nz",
  Ro = "ro",
  Es = "es",
  Us = "us",
}

export enum SourceType {
  Tmdb = "tmdb",
  Mappings = "mappings",
  User = "user",
  Indexer = "indexer",
}

export enum SortDirection {
  Default = "default",
  Ascending = "ascending",
  Descending = "descending",
}

export enum RuntimeMode {
  Console = "console",
  Service = "service",
  Tray = "tray",
}

export enum RescanAfterRefreshType {
  Always = "always",
  AfterManual = "afterManual",
  Never = "never",
}

export enum RejectionType {
  Permanent = "permanent",
  Temporary = "temporary",
}

export enum RatingType {
  User = "user",
  Critic = "critic",
}

export enum QueueStatus {
  Unknown = "unknown",
  Queued = "queued",
  Paused = "paused",
  Downloading = "downloading",
  Completed = "completed",
  Failed = "failed",
  Warning = "warning",
  Delay = "delay",
  DownloadClientUnavailable = "downloadClientUnavailable",
  Fallback = "fallback",
}

export enum QualitySource {
  Unknown = "unknown",
  Cam = "cam",
  Telesync = "telesync",
  Telecine = "telecine",
  Workprint = "workprint",
  Dvd = "dvd",
  Tv = "tv",
  Webdl = "webdl",
  Webrip = "webrip",
  Bluray = "bluray",
}

export enum ProxyType {
  Http = "http",
  Socks4 = "socks4",
  Socks5 = "socks5",
}

export enum ProviderMessageType {
  Info = "info",
  Warning = "warning",
  Error = "error",
}

export enum ProperDownloadTypes {
  PreferAndUpgrade = "preferAndUpgrade",
  DoNotUpgrade = "doNotUpgrade",
  DoNotPrefer = "doNotPrefer",
}

export enum PrivacyLevel {
  Normal = "normal",
  Password = "password",
  ApiKey = "apiKey",
  UserName = "userName",
}

export enum MovieStatusType {
  Tba = "tba",
  Announced = "announced",
  InCinemas = "inCinemas",
  Released = "released",
  Deleted = "deleted",
}

export enum MovieRuntimeFormatType {
  HoursMinutes = "hoursMinutes",
  Minutes = "minutes",
}

export enum MovieHistoryEventType {
  Unknown = "unknown",
  Grabbed = "grabbed",
  DownloadFolderImported = "downloadFolderImported",
  DownloadFailed = "downloadFailed",
  MovieFileDeleted = "movieFileDeleted",
  MovieFolderImported = "movieFolderImported",
  MovieFileRenamed = "movieFileRenamed",
  DownloadIgnored = "downloadIgnored",
}

export enum MonitorTypes {
  MovieOnly = "movieOnly",
  MovieAndCollection = "movieAndCollection",
  None = "none",
}

export enum Modifier {
  None = "none",
  Regional = "regional",
  Screener = "screener",
  Rawhd = "rawhd",
  Brdisk = "brdisk",
  Remux = "remux",
}

export enum MediaCoverTypes {
  Unknown = "unknown",
  Poster = "poster",
  Banner = "banner",
  Fanart = "fanart",
  Screenshot = "screenshot",
  Headshot = "headshot",
  Clearlogo = "clearlogo",
}

export enum ImportListType {
  Program = "program",
  Tmdb = "tmdb",
  Trakt = "trakt",
  Plex = "plex",
  Simkl = "simkl",
  Other = "other",
  Advanced = "advanced",
}

export enum HealthCheckResult {
  Ok = "ok",
  Notice = "notice",
  Warning = "warning",
  Error = "error",
}

export enum FileDateType {
  None = "none",
  Cinemas = "cinemas",
  Release = "release",
}

export enum ExtraFileType {
  Subtitle = "subtitle",
  Metadata = "metadata",
  Other = "other",
}

export enum DownloadProtocol {
  Unknown = "unknown",
  Usenet = "usenet",
  Torrent = "torrent",
}

export enum DatabaseType {
  SqLite = "sqLite",
  PostgreSQL = "postgreSQL",
}

export enum CreditType {
  Cast = "cast",
  Crew = "crew",
}

export enum CommandTrigger {
  Unspecified = "unspecified",
  Manual = "manual",
  Scheduled = "scheduled",
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

export enum CommandResult {
  Unknown = "unknown",
  Successful = "successful",
  Unsuccessful = "unsuccessful",
}

export enum CommandPriority {
  Normal = "normal",
  High = "high",
  Low = "low",
}

export enum ColonReplacementFormat {
  Delete = "delete",
  Dash = "dash",
  SpaceDash = "spaceDash",
  SpaceDashSpace = "spaceDashSpace",
  Smart = "smart",
}

export enum CertificateValidationType {
  Enabled = "enabled",
  DisabledForLocalAddresses = "disabledForLocalAddresses",
  Disabled = "disabled",
}

export enum CalendarReleaseType {
  CinemaRelease = "cinemaRelease",
  DigitalRelease = "digitalRelease",
  PhysicalRelease = "physicalRelease",
}

export enum BackupType {
  Scheduled = "scheduled",
  Manual = "manual",
  Update = "update",
}

export enum AuthenticationType {
  None = "none",
  Basic = "basic",
  Forms = "forms",
  External = "external",
}

export enum AuthenticationRequiredType {
  Enabled = "enabled",
  DisabledForLocalAddresses = "disabledForLocalAddresses",
}

export enum ApplyTags {
  Add = "add",
  Remove = "remove",
  Replace = "replace",
}

export enum AddMovieMethod {
  Manual = "manual",
  List = "list",
  Collection = "collection",
}

export interface AddMovieOptions {
  ignoreEpisodesWithFiles?: boolean;
  ignoreEpisodesWithoutFiles?: boolean;
  monitor?: MonitorTypes;
  searchForMovie?: boolean;
  addMethod?: AddMovieMethod;
}

export interface AlternativeTitleResource {
  /** @format int32 */
  id?: number;
  sourceType?: SourceType;
  /** @format int32 */
  movieMetadataId?: number;
  title?: string | null;
  cleanTitle?: string | null;
}

export interface ApiInfoResource {
  current?: string | null;
  deprecated?: string[] | null;
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

export interface BlocklistBulkResource {
  ids?: number[] | null;
}

export interface BlocklistResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  movieId?: number;
  sourceTitle?: string | null;
  languages?: Language[] | null;
  quality?: QualityModel;
  customFormats?: CustomFormatResource[] | null;
  /** @format date-time */
  date?: string;
  protocol?: DownloadProtocol;
  indexer?: string | null;
  message?: string | null;
  movie?: MovieResource;
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

export interface CollectionMovieResource {
  /** @format int32 */
  tmdbId?: number;
  imdbId?: string | null;
  title?: string | null;
  cleanTitle?: string | null;
  sortTitle?: string | null;
  status?: MovieStatusType;
  overview?: string | null;
  /** @format int32 */
  runtime?: number;
  images?: MediaCover[] | null;
  /** @format int32 */
  year?: number;
  ratings?: Ratings;
  genres?: string[] | null;
  folder?: string | null;
  isExisting?: boolean;
  isExcluded?: boolean;
}

export interface CollectionResource {
  /** @format int32 */
  id?: number;
  title?: string | null;
  sortTitle?: string | null;
  /** @format int32 */
  tmdbId?: number;
  images?: MediaCover[] | null;
  overview?: string | null;
  monitored?: boolean;
  rootFolderPath?: string | null;
  /** @format int32 */
  qualityProfileId?: number;
  searchOnAdd?: boolean;
  minimumAvailability?: MovieStatusType;
  movies?: CollectionMovieResource[] | null;
  /** @format int32 */
  missingMovies?: number;
  /** @uniqueItems true */
  tags?: number[] | null;
}

export interface CollectionUpdateResource {
  collectionIds?: number[] | null;
  monitored?: boolean | null;
  monitorMovies?: boolean | null;
  searchOnAdd?: boolean | null;
  /** @format int32 */
  qualityProfileId?: number | null;
  rootFolderPath?: string | null;
  minimumAvailability?: MovieStatusType;
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

export interface CreditResource {
  /** @format int32 */
  id?: number;
  personName?: string | null;
  creditTmdbId?: string | null;
  /** @format int32 */
  personTmdbId?: number;
  /** @format int32 */
  movieMetadataId?: number;
  images?: MediaCover[] | null;
  department?: string | null;
  job?: string | null;
  character?: string | null;
  /** @format int32 */
  order?: number;
  type?: CreditType;
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
  /** @format int32 */
  checkForFinishedDownloadInterval?: number;
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

export interface ExtraFileResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  movieId?: number;
  /** @format int32 */
  movieFileId?: number | null;
  relativePath?: string | null;
  extension?: string | null;
  languageTags?: string[] | null;
  title?: string | null;
  type?: ExtraFileType;
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

export interface HealthResource {
  /** @format int32 */
  id?: number;
  source?: string | null;
  type?: HealthCheckResult;
  message?: string | null;
  wikiUrl?: string | null;
}

export interface HistoryResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  movieId?: number;
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
  eventType?: MovieHistoryEventType;
  data?: Record<string, string | null>;
  movie?: MovieResource;
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

export interface ImportListBulkResource {
  ids?: number[] | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  enabled?: boolean | null;
  enableAuto?: boolean | null;
  rootFolderPath?: string | null;
  /** @format int32 */
  qualityProfileId?: number | null;
  minimumAvailability?: MovieStatusType;
}

export interface ImportListConfigResource {
  /** @format int32 */
  id?: number;
  listSyncLevel?: string | null;
}

export interface ImportListExclusionBulkResource {
  /** @uniqueItems true */
  ids?: number[] | null;
}

export interface ImportListExclusionResource {
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
  presets?: ImportListExclusionResource[] | null;
  /** @format int32 */
  tmdbId?: number;
  movieTitle?: string | null;
  /** @format int32 */
  movieYear?: number;
}

export interface ImportListExclusionResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: ImportListExclusionResource[] | null;
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
  enabled?: boolean;
  enableAuto?: boolean;
  monitor?: MonitorTypes;
  rootFolderPath?: string | null;
  /** @format int32 */
  qualityProfileId?: number;
  searchOnAdd?: boolean;
  minimumAvailability?: MovieStatusType;
  listType?: ImportListType;
  /** @format int32 */
  listOrder?: number;
  /** @format date-span */
  minRefreshInterval?: string;
}

export interface ImportRejectionResource {
  reason?: string | null;
  type?: RejectionType;
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
  preferIndexerFlags?: boolean;
  /** @format int32 */
  availabilityDelay?: number;
  allowHardcodedSubs?: boolean;
  whitelistedHardcodedSubs?: string | null;
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

export interface Language {
  /** @format int32 */
  id?: number;
  name?: string | null;
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
  movieId?: number;
  movie?: MovieResource;
  quality?: QualityModel;
  languages?: Language[] | null;
  releaseGroup?: string | null;
  downloadId?: string | null;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  /** @format int32 */
  indexerFlags?: number;
  rejections?: ImportRejectionResource[] | null;
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
  movie?: MovieResource;
  /** @format int32 */
  movieFileId?: number | null;
  releaseGroup?: string | null;
  quality?: QualityModel;
  languages?: Language[] | null;
  /** @format int32 */
  qualityWeight?: number;
  downloadId?: string | null;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  /** @format int32 */
  indexerFlags?: number;
  rejections?: ImportRejectionResource[] | null;
}

export interface MediaCover {
  coverType?: MediaCoverTypes;
  url?: string | null;
  remoteUrl?: string | null;
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
  autoUnmonitorPreviouslyDownloadedMovies?: boolean;
  recycleBin?: string | null;
  /** @format int32 */
  recycleBinCleanupDays?: number;
  downloadPropersAndRepacks?: ProperDownloadTypes;
  createEmptyMovieFolders?: boolean;
  deleteEmptyFolders?: boolean;
  fileDate?: FileDateType;
  rescanAfterRefresh?: RescanAfterRefreshType;
  autoRenameFolders?: boolean;
  pathsDefaultStatic?: boolean;
  setPermissionsLinux?: boolean;
  chmodFolder?: string | null;
  chownGroup?: string | null;
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

export interface MetadataConfigResource {
  /** @format int32 */
  id?: number;
  certificationCountry?: TMDbCountryCode;
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

export interface MovieCollectionResource {
  title?: string | null;
  /** @format int32 */
  tmdbId?: number;
}

export interface MovieEditorResource {
  movieIds?: number[] | null;
  monitored?: boolean | null;
  /** @format int32 */
  qualityProfileId?: number | null;
  minimumAvailability?: MovieStatusType;
  rootFolderPath?: string | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  moveFiles?: boolean;
  deleteFiles?: boolean;
  addImportExclusion?: boolean;
}

export interface MovieFileListResource {
  movieFileIds?: number[] | null;
  languages?: Language[] | null;
  quality?: QualityModel;
  edition?: string | null;
  releaseGroup?: string | null;
  sceneName?: string | null;
  /** @format int32 */
  indexerFlags?: number | null;
}

export interface MovieFileResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  movieId?: number;
  relativePath?: string | null;
  path?: string | null;
  /** @format int64 */
  size?: number;
  /** @format date-time */
  dateAdded?: string;
  sceneName?: string | null;
  releaseGroup?: string | null;
  edition?: string | null;
  languages?: Language[] | null;
  quality?: QualityModel;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number | null;
  /** @format int32 */
  indexerFlags?: number | null;
  mediaInfo?: MediaInfoResource;
  originalFilePath?: string | null;
  qualityCutoffNotMet?: boolean;
}

export interface MovieResource {
  /** @format int32 */
  id?: number;
  title?: string | null;
  originalTitle?: string | null;
  originalLanguage?: Language;
  alternateTitles?: AlternativeTitleResource[] | null;
  /** @format int32 */
  secondaryYear?: number | null;
  /** @format int32 */
  secondaryYearSourceId?: number;
  sortTitle?: string | null;
  /** @format int64 */
  sizeOnDisk?: number | null;
  status?: MovieStatusType;
  overview?: string | null;
  /** @format date-time */
  inCinemas?: string | null;
  /** @format date-time */
  physicalRelease?: string | null;
  /** @format date-time */
  digitalRelease?: string | null;
  /** @format date-time */
  releaseDate?: string | null;
  physicalReleaseNote?: string | null;
  images?: MediaCover[] | null;
  website?: string | null;
  remotePoster?: string | null;
  /** @format int32 */
  year?: number;
  youTubeTrailerId?: string | null;
  studio?: string | null;
  path?: string | null;
  /** @format int32 */
  qualityProfileId?: number;
  hasFile?: boolean | null;
  /** @format int32 */
  movieFileId?: number;
  monitored?: boolean;
  minimumAvailability?: MovieStatusType;
  isAvailable?: boolean;
  folderName?: string | null;
  /** @format int32 */
  runtime?: number;
  cleanTitle?: string | null;
  imdbId?: string | null;
  /** @format int32 */
  tmdbId?: number;
  titleSlug?: string | null;
  rootFolderPath?: string | null;
  folder?: string | null;
  certification?: string | null;
  genres?: string[] | null;
  keywords?: string[] | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  /** @format date-time */
  added?: string;
  addOptions?: AddMovieOptions;
  ratings?: Ratings;
  movieFile?: MovieFileResource;
  collection?: MovieCollectionResource;
  /** @format float */
  popularity?: number;
  /** @format date-time */
  lastSearchTime?: string | null;
  statistics?: MovieStatisticsResource;
}

export interface MovieResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: MovieResource[] | null;
}

export interface MovieStatisticsResource {
  /** @format int32 */
  movieFileCount?: number;
  /** @format int64 */
  sizeOnDisk?: number;
  releaseGroups?: string[] | null;
}

export interface NamingConfigResource {
  /** @format int32 */
  id?: number;
  renameMovies?: boolean;
  replaceIllegalCharacters?: boolean;
  colonReplacementFormat?: ColonReplacementFormat;
  standardMovieFormat?: string | null;
  movieFolderFormat?: string | null;
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
  onMovieAdded?: boolean;
  onMovieDelete?: boolean;
  onMovieFileDelete?: boolean;
  onMovieFileDeleteForUpgrade?: boolean;
  onHealthIssue?: boolean;
  includeHealthWarnings?: boolean;
  onHealthRestored?: boolean;
  onApplicationUpdate?: boolean;
  onManualInteractionRequired?: boolean;
  supportsOnGrab?: boolean;
  supportsOnDownload?: boolean;
  supportsOnUpgrade?: boolean;
  supportsOnRename?: boolean;
  supportsOnMovieAdded?: boolean;
  supportsOnMovieDelete?: boolean;
  supportsOnMovieFileDelete?: boolean;
  supportsOnMovieFileDeleteForUpgrade?: boolean;
  supportsOnHealthIssue?: boolean;
  supportsOnHealthRestored?: boolean;
  supportsOnApplicationUpdate?: boolean;
  supportsOnManualInteractionRequired?: boolean;
  testCommand?: string | null;
}

export interface ParseResource {
  /** @format int32 */
  id?: number;
  title?: string | null;
  parsedMovieInfo?: ParsedMovieInfo;
  movie?: MovieResource;
  languages?: Language[] | null;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
}

export interface ParsedMovieInfo {
  movieTitles?: string[] | null;
  originalTitle?: string | null;
  releaseTitle?: string | null;
  simpleReleaseTitle?: string | null;
  quality?: QualityModel;
  languages?: Language[] | null;
  releaseGroup?: string | null;
  releaseHash?: string | null;
  edition?: string | null;
  /** @format int32 */
  year?: number;
  imdbId?: string | null;
  /** @format int32 */
  tmdbId?: number;
  hardcodedSubs?: string | null;
  movieTitle?: string | null;
  primaryMovieTitle?: string | null;
}

export interface PingResource {
  status?: string | null;
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

export interface ProviderMessage {
  message?: string | null;
  type?: ProviderMessageType;
}

export interface Quality {
  /** @format int32 */
  id?: number;
  name?: string | null;
  source?: QualitySource;
  /** @format int32 */
  resolution?: number;
  modifier?: Modifier;
}

export interface QualityDefinitionLimitsResource {
  /** @format int32 */
  min?: number;
  /** @format int32 */
  max?: number;
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
  /** @format int32 */
  minUpgradeFormatScore?: number;
  formatItems?: ProfileFormatItemResource[] | null;
  language?: Language;
}

export interface QueueBulkResource {
  ids?: number[] | null;
}

export interface QueueResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  movieId?: number | null;
  movie?: MovieResource;
  languages?: Language[] | null;
  quality?: QualityModel;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  /** @format double */
  size?: number;
  title?: string | null;
  /** @format date-time */
  estimatedCompletionTime?: string | null;
  /** @format date-time */
  added?: string | null;
  status?: QueueStatus;
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
  /**
   * @deprecated
   * @format double
   */
  sizeleft?: number;
  /**
   * @deprecated
   * @format date-span
   */
  timeleft?: string | null;
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

export interface RatingChild {
  /** @format int32 */
  votes?: number;
  /** @format double */
  value?: number;
  type?: RatingType;
}

export interface Ratings {
  imdb?: RatingChild;
  tmdb?: RatingChild;
  metacritic?: RatingChild;
  rottenTomatoes?: RatingChild;
  trakt?: RatingChild;
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
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
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
  movieTitles?: string[] | null;
  languages?: Language[] | null;
  /** @format int32 */
  mappedMovieId?: number | null;
  approved?: boolean;
  temporarilyRejected?: boolean;
  rejected?: boolean;
  /** @format int32 */
  tmdbId?: number;
  /** @format int32 */
  imdbId?: number;
  rejections?: string[] | null;
  /** @format date-time */
  publishDate?: string;
  commentUrl?: string | null;
  downloadUrl?: string | null;
  infoUrl?: string | null;
  movieRequested?: boolean;
  downloadAllowed?: boolean;
  /** @format int32 */
  releaseWeight?: number;
  edition?: string | null;
  magnetUrl?: string | null;
  infoHash?: string | null;
  /** @format int32 */
  seeders?: number | null;
  /** @format int32 */
  leechers?: number | null;
  protocol?: DownloadProtocol;
  indexerFlags?: any;
  /** @format int32 */
  movieId?: number | null;
  /** @format int32 */
  downloadClientId?: number | null;
  downloadClient?: string | null;
  shouldOverride?: boolean | null;
}

export interface RemotePathMappingResource {
  /** @format int32 */
  id?: number;
  host?: string | null;
  remotePath?: string | null;
  localPath?: string | null;
}

export interface RenameMovieResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  movieId?: number;
  /** @format int32 */
  movieFileId?: number;
  existingPath?: string | null;
  newPath?: string | null;
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

export interface SelectOption {
  /** @format int32 */
  value?: number;
  name?: string | null;
  /** @format int32 */
  order?: number;
  hint?: string | null;
  dividerAfter?: boolean;
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
  releaseProfileIds?: number[] | null;
  indexerIds?: number[] | null;
  downloadClientIds?: number[] | null;
  autoTagIds?: number[] | null;
  movieIds?: number[] | null;
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
  movieRuntimeFormat?: MovieRuntimeFormatType;
  shortDateFormat?: string | null;
  longDateFormat?: string | null;
  timeFormat?: string | null;
  showRelativeDates?: boolean;
  enableColorImpairedMode?: boolean;
  /** @format int32 */
  movieInfoLanguage?: number;
  /** @format int32 */
  uiLanguage?: number;
  theme?: string | null;
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
