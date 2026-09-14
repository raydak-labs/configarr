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

export enum TvSearchParam {
  Q = "q",
  Season = "season",
  Ep = "ep",
  ImdbId = "imdbId",
  TvdbId = "tvdbId",
  RId = "rId",
  TvMazeId = "tvMazeId",
  TraktId = "traktId",
  TmdbId = "tmdbId",
  DoubanId = "doubanId",
  Genre = "genre",
  Year = "year",
}

export enum SortDirection {
  Default = "default",
  Ascending = "ascending",
  Descending = "descending",
}

export enum SearchParam {
  Q = "q",
}

export enum RuntimeMode {
  Console = "console",
  Service = "service",
  Tray = "tray",
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

export enum PrivacyLevel {
  Normal = "normal",
  Password = "password",
  ApiKey = "apiKey",
  UserName = "userName",
}

export enum MusicSearchParam {
  Q = "q",
  Album = "album",
  Artist = "artist",
  Label = "label",
  Year = "year",
  Genre = "genre",
  Track = "track",
}

export enum MovieSearchParam {
  Q = "q",
  ImdbId = "imdbId",
  TmdbId = "tmdbId",
  ImdbTitle = "imdbTitle",
  ImdbYear = "imdbYear",
  TraktId = "traktId",
  Genre = "genre",
  DoubanId = "doubanId",
  Year = "year",
}

export enum IndexerPrivacy {
  Public = "public",
  SemiPrivate = "semiPrivate",
  Private = "private",
}

export enum HistoryEventType {
  Unknown = "unknown",
  ReleaseGrabbed = "releaseGrabbed",
  IndexerQuery = "indexerQuery",
  IndexerRss = "indexerRss",
  IndexerAuth = "indexerAuth",
  IndexerInfo = "indexerInfo",
}

export enum HealthCheckResult {
  Ok = "ok",
  Notice = "notice",
  Warning = "warning",
  Error = "error",
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

export enum CommandPriority {
  Normal = "normal",
  High = "high",
  Low = "low",
}

export enum CertificateValidationType {
  Enabled = "enabled",
  DisabledForLocalAddresses = "disabledForLocalAddresses",
  Disabled = "disabled",
}

export enum BookSearchParam {
  Q = "q",
  Title = "title",
  Author = "author",
  Publisher = "publisher",
  Genre = "genre",
  Year = "year",
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

export enum ApplicationSyncLevel {
  Disabled = "disabled",
  AddOnly = "addOnly",
  FullSync = "fullSync",
}

export interface ApiInfoResource {
  current?: string | null;
  deprecated?: string[] | null;
}

export interface AppProfileResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  enableRss?: boolean;
  enableAutomaticSearch?: boolean;
  enableInteractiveSearch?: boolean;
  /** @format int32 */
  minimumSeeders?: number;
}

export interface ApplicationBulkResource {
  ids?: number[] | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  syncLevel?: ApplicationSyncLevel;
}

export interface ApplicationResource {
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
  presets?: ApplicationResource[] | null;
  syncLevel?: ApplicationSyncLevel;
  testCommand?: string | null;
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

export interface Command {
  sendUpdatesToClient?: boolean;
  updateScheduledTask?: boolean;
  completionMessage?: string | null;
  requiresDiskAccess?: boolean;
  isExclusive?: boolean;
  isTypeExclusive?: boolean;
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

export interface CustomFilterResource {
  /** @format int32 */
  id?: number;
  type?: string | null;
  label?: string | null;
  filters?: Record<string, any>[] | null;
}

export interface DevelopmentConfigResource {
  /** @format int32 */
  id?: number;
  consoleLogLevel?: string | null;
  logSql?: boolean;
  logIndexerResponse?: boolean;
  /** @format int32 */
  logRotate?: number;
  filterSentryEvents?: boolean;
}

export interface DownloadClientBulkResource {
  ids?: number[] | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  enable?: boolean | null;
  /** @format int32 */
  priority?: number | null;
}

export interface DownloadClientCategory {
  clientCategory?: string | null;
  categories?: number[] | null;
}

export interface DownloadClientConfigResource {
  /** @format int32 */
  id?: number;
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
  categories?: DownloadClientCategory[] | null;
  supportsCategories?: boolean;
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
  value?: any | null;
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
  indexerId?: number;
  /** @format date-time */
  date?: string;
  downloadId?: string | null;
  successful?: boolean;
  eventType?: HistoryEventType;
  data?: Record<string, string | null>;
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
  /** @format int32 */
  historyCleanupDays?: number;
  trustCgnatIpAddresses?: boolean;
}

export interface HostStatistics {
  host?: string | null;
  /** @format int32 */
  numberOfQueries?: number;
  /** @format int32 */
  numberOfGrabs?: number;
}

export type IActionResult = object;

export interface IndexerBulkResource {
  ids?: number[] | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  enable?: boolean | null;
  /** @format int32 */
  appProfileId?: number | null;
  /** @format int32 */
  priority?: number | null;
  /** @format int32 */
  minimumSeeders?: number | null;
  /** @format double */
  seedRatio?: number | null;
  /** @format int32 */
  seedTime?: number | null;
  /** @format int32 */
  packSeedTime?: number | null;
  preferMagnetUrl?: boolean | null;
}

export interface IndexerCapabilityResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  limitsMax?: number | null;
  /** @format int32 */
  limitsDefault?: number | null;
  categories?: IndexerCategory[] | null;
  supportsRawSearch?: boolean;
  searchParams?: SearchParam[] | null;
  tvSearchParams?: TvSearchParam[] | null;
  movieSearchParams?: MovieSearchParam[] | null;
  musicSearchParams?: MusicSearchParam[] | null;
  bookSearchParams?: BookSearchParam[] | null;
}

export interface IndexerCategory {
  /** @format int32 */
  id?: number;
  name?: string | null;
  description?: string | null;
  subCategories?: IndexerCategory[] | null;
}

export interface IndexerProxyResource {
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
  presets?: IndexerProxyResource[] | null;
  link?: string | null;
  onHealthIssue?: boolean;
  supportsOnHealthIssue?: boolean;
  includeHealthWarnings?: boolean;
  testCommand?: string | null;
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
  indexerUrls?: string[] | null;
  legacyUrls?: string[] | null;
  definitionName?: string | null;
  description?: string | null;
  language?: string | null;
  encoding?: string | null;
  enable?: boolean;
  redirect?: boolean;
  supportsRss?: boolean;
  supportsSearch?: boolean;
  supportsRedirect?: boolean;
  supportsPagination?: boolean;
  /** @format int32 */
  appProfileId?: number;
  protocol?: DownloadProtocol;
  privacy?: IndexerPrivacy;
  capabilities?: IndexerCapabilityResource;
  /** @format int32 */
  priority?: number;
  /** @format int32 */
  downloadClientId?: number;
  /** @format date-time */
  added?: string;
  status?: IndexerStatusResource;
  sortName?: string | null;
}

export interface IndexerStatistics {
  /** @format int32 */
  indexerId?: number;
  indexerName?: string | null;
  /** @format int32 */
  averageResponseTime?: number;
  /** @format int32 */
  averageGrabResponseTime?: number;
  /** @format int32 */
  numberOfQueries?: number;
  /** @format int32 */
  numberOfGrabs?: number;
  /** @format int32 */
  numberOfRssQueries?: number;
  /** @format int32 */
  numberOfAuthQueries?: number;
  /** @format int32 */
  numberOfFailedQueries?: number;
  /** @format int32 */
  numberOfFailedGrabs?: number;
  /** @format int32 */
  numberOfFailedRssQueries?: number;
  /** @format int32 */
  numberOfFailedAuthQueries?: number;
}

export interface IndexerStatsResource {
  /** @format int32 */
  id?: number;
  indexers?: IndexerStatistics[] | null;
  userAgents?: UserAgentStatistics[] | null;
  hosts?: HostStatistics[] | null;
}

export interface IndexerStatusResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  indexerId?: number;
  /** @format date-time */
  disabledTill?: string | null;
  /** @format date-time */
  mostRecentFailure?: string | null;
  /** @format date-time */
  initialFailure?: string | null;
}

export interface LocalizationOption {
  name?: string | null;
  value?: string | null;
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
  onHealthIssue?: boolean;
  onHealthRestored?: boolean;
  onApplicationUpdate?: boolean;
  supportsOnGrab?: boolean;
  includeManualGrabs?: boolean;
  supportsOnHealthIssue?: boolean;
  supportsOnHealthRestored?: boolean;
  includeHealthWarnings?: boolean;
  supportsOnApplicationUpdate?: boolean;
  testCommand?: string | null;
}

export interface PingResource {
  status?: string | null;
}

export interface ProviderMessage {
  message?: string | null;
  type?: ProviderMessageType;
}

export interface ReleaseResource {
  /** @format int32 */
  id?: number;
  guid?: string | null;
  /** @format int32 */
  age?: number;
  /** @format double */
  ageHours?: number;
  /** @format double */
  ageMinutes?: number;
  /** @format int64 */
  size?: number;
  /** @format int32 */
  files?: number | null;
  /** @format int32 */
  grabs?: number | null;
  /** @format int32 */
  indexerId?: number;
  indexer?: string | null;
  subGroup?: string | null;
  releaseHash?: string | null;
  title?: string | null;
  sortTitle?: string | null;
  /** @format int32 */
  imdbId?: number;
  /** @format int32 */
  tmdbId?: number;
  /** @format int32 */
  tvdbId?: number;
  /** @format int32 */
  tvMazeId?: number;
  /** @format date-time */
  publishDate?: string;
  commentUrl?: string | null;
  downloadUrl?: string | null;
  infoUrl?: string | null;
  posterUrl?: string | null;
  indexerFlags?: string[] | null;
  categories?: IndexerCategory[] | null;
  magnetUrl?: string | null;
  infoHash?: string | null;
  /** @format int32 */
  seeders?: number | null;
  /** @format int32 */
  leechers?: number | null;
  protocol?: DownloadProtocol;
  fileName?: string | null;
  /** @format int32 */
  downloadClientId?: number | null;
}

export interface SelectOption {
  /** @format int32 */
  value?: number;
  name?: string | null;
  /** @format int32 */
  order?: number;
  hint?: string | null;
  /** @format int32 */
  parentValue?: number | null;
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
  notificationIds?: number[] | null;
  indexerIds?: number[] | null;
  indexerProxyIds?: number[] | null;
  applicationIds?: number[] | null;
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
  uiLanguage?: string | null;
  theme?: string | null;
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

export interface UserAgentStatistics {
  userAgent?: string | null;
  /** @format int32 */
  numberOfQueries?: number;
  /** @format int32 */
  numberOfGrabs?: number;
}
