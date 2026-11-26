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

export enum WriteBookTagsType {
  NewFiles = "newFiles",
  AllFiles = "allFiles",
  Sync = "sync",
}

export enum WriteAudioTagsType {
  No = "no",
  NewFiles = "newFiles",
  AllFiles = "allFiles",
  Sync = "sync",
}

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
  DownloadFailed = "downloadFailed",
  DownloadFailedPending = "downloadFailedPending",
  ImportPending = "importPending",
  Importing = "importing",
  Imported = "imported",
  Ignored = "ignored",
  ImportBlocked = "importBlocked",
}

export enum SortDirection {
  Default = "default",
  Ascending = "ascending",
  Descending = "descending",
}

export enum SettingsBackupRestoreMode {
  Overwrite = "overwrite",
  Merge = "merge",
}

export enum SettingsBackupCategory {
  Indexers = "indexers",
  DownloadClients = "downloadClients",
  Connections = "connections",
  Profiles = "profiles",
  MediaManagement = "mediaManagement",
  MetadataServer = "metadataServer",
  Proxies = "proxies",
  Hardcover = "hardcover",
  RemotePathMappings = "remotePathMappings",
  UiSettings = "uiSettings",
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

export enum ProxyType {
  Http = "http",
  Socks4 = "socks4",
  Socks5 = "socks5",
}

export enum ProxyMode {
  Disabled = "disabled",
  IndexerOnly = "indexerOnly",
  ProxyEverything = "proxyEverything",
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

export enum ProfileType {
  Audiobook = "audiobook",
  Ebook = "ebook",
}

export enum NewItemMonitorTypes {
  All = "all",
  None = "none",
  New = "new",
}

export enum MonitorTypes {
  All = "all",
  Future = "future",
  Missing = "missing",
  Existing = "existing",
  Latest = "latest",
  First = "first",
  None = "none",
  SpecificBook = "specificBook",
  Unknown = "unknown",
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

export enum ImportListType {
  Program = "program",
  Goodreads = "goodreads",
  Other = "other",
}

export enum ImportListMonitorType {
  None = "none",
  SpecificBook = "specificBook",
  EntireAuthor = "entireAuthor",
}

export enum HealthCheckResult {
  Ok = "ok",
  Notice = "notice",
  Warning = "warning",
  Error = "error",
}

export enum FileDateType {
  None = "none",
  BookReleaseDate = "bookReleaseDate",
}

export enum EntityHistoryEventType {
  Unknown = "unknown",
  Grabbed = "grabbed",
  BookFileImported = "bookFileImported",
  DownloadFailed = "downloadFailed",
  BookFileDeleted = "bookFileDeleted",
  BookFileRenamed = "bookFileRenamed",
  BookImportIncomplete = "bookImportIncomplete",
  DownloadImported = "downloadImported",
  BookFileRetagged = "bookFileRetagged",
  DownloadIgnored = "downloadIgnored",
  BookFileConverted = "bookFileConverted",
  BookFileConversionFailed = "bookFileConversionFailed",
  AuthorsMerged = "authorsMerged",
  AuthorSplit = "authorSplit",
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

export enum CustomFormatMediaType {
  Both = "both",
  Audiobook = "audiobook",
  Ebook = "ebook",
}

export enum CoverDownloadScope {
  AllBooks = "allBooks",
  LibraryBooks = "libraryBooks",
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
  Paused = "paused",
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

export enum CertificateValidationType {
  Enabled = "enabled",
  DisabledForLocalAddresses = "disabledForLocalAddresses",
  Disabled = "disabled",
}

export enum BookMediaType {
  Audiobook = "audiobook",
  Ebook = "ebook",
}

export enum BookMatchingStrictness {
  Aggressive = "aggressive",
  Balanced = "balanced",
  Strict = "strict",
}

export enum BookAddType {
  Automatic = "automatic",
  Manual = "manual",
}

export enum BackupType {
  Scheduled = "scheduled",
  Manual = "manual",
  Update = "update",
}

export enum AuthorStatusType {
  Continuing = "continuing",
  Ended = "ended",
}

export enum AuthenticationType {
  None = "none",
  Basic = "basic",
  Forms = "forms",
  External = "external",
  Oidc = "oidc",
  Plex = "plex",
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

export enum AllowFingerprinting {
  Never = "never",
  NewFiles = "newFiles",
  AllFiles = "allFiles",
}

export interface AddAuthorOptions {
  monitor?: MonitorTypes | null;
  mediaType?: BookMediaType | null;
  booksToMonitor?: string[] | null;
  monitored?: boolean;
  audiobookMonitor?: MonitorTypes | null;
  ebookMonitor?: MonitorTypes | null;
  searchForMissingBooks?: boolean;
  awaitingMetadata?: boolean;
  /** @format int32 */
  initialFormatSyncFailureCount?: number;
  /** @format date-time */
  initialFormatSyncNotBefore?: string | null;
  metadataUnavailable?: boolean;
  audiobookSetupPending?: boolean;
  ebookSetupPending?: boolean;
  audiobookAwaitingMetadata?: boolean;
  ebookAwaitingMetadata?: boolean;
  /** @format int32 */
  audiobookSetupPendingImportId?: number | null;
  /** @format int32 */
  ebookSetupPendingImportId?: number | null;
  audiobookSetupSearchForMissingBooks?: boolean;
  ebookSetupSearchForMissingBooks?: boolean;
  independentSearchForMissingBooks?: boolean;
}

export interface AddBookOptions {
  addType?: BookAddType;
  searchForNewBook?: boolean;
  monitorBook?: boolean | null;
}

export interface AddSeriesRequest {
  foreignSeriesId?: string | null;
  selectedMediaType?: string | null;
  selectedBooks?: SelectedSeriesBook[] | null;
  monitor?: string | null;
  audiobookMonitorExistingMode?: MonitorTypes | null;
  ebookMonitorExistingMode?: MonitorTypes | null;
  audiobookMonitored?: boolean | null;
  audiobookMonitorNewItems?: NewItemMonitorTypes | null;
  ebookMonitored?: boolean | null;
  ebookMonitorNewItems?: NewItemMonitorTypes | null;
  rootFolderPath?: string | null;
  audiobookRootFolderPath?: string | null;
  ebookRootFolderPath?: string | null;
  /** @format int32 */
  audiobookQualityProfileId?: number | null;
  /** @format int32 */
  ebookQualityProfileId?: number | null;
  /** @format int32 */
  audiobookMetadataProfileId?: number | null;
  /** @format int32 */
  ebookMetadataProfileId?: number | null;
  tags?: number[] | null;
}

export interface AddWantedEditionRequest {
  /** @format int32 */
  editionId?: number;
  searchForNewBook?: boolean;
}

export interface ApiErrorResource {
  error?: string | null;
  message?: string | null;
}

export interface ApiInfoResource {
  current?: string | null;
  deprecated?: string[] | null;
}

export interface ApiMessageResource {
  message?: string | null;
}

export interface ApiSuccessResource {
  success?: boolean;
  message?: string | null;
}

export interface AudioBookShelfLibraryMapping {
  /** @format int32 */
  rootFolderId?: number;
  mediaType?: string | null;
  libraryId?: string | null;
  libraryFolderId?: string | null;
  libraryFolderPath?: string | null;
}

export interface AuthorDeletionFile {
  path?: string | null;
  reason?: string | null;
}

export interface AuthorDeletionFolder {
  path?: string | null;
  deleteContents?: boolean;
  reason?: string | null;
  /** @format int32 */
  bookFileCount?: number;
  /** @format int64 */
  size?: number;
  otherFiles?: string[] | null;
}

export interface AuthorDeletionOtherAuthor {
  /** @format int32 */
  authorId?: number;
  name?: string | null;
  /** @format int32 */
  fileCount?: number;
}

export interface AuthorDeletionPreview {
  recycleBin?: string | null;
  folders?: AuthorDeletionFolder[] | null;
  files?: AuthorDeletionFile[] | null;
  otherAuthors?: AuthorDeletionOtherAuthor[] | null;
  warnings?: string[] | null;
}

export interface AuthorEditorResource {
  authorIds?: number[] | null;
  audiobookMonitored?: boolean | null;
  audiobookMonitorNewItems?: NewItemMonitorTypes | null;
  ebookMonitored?: boolean | null;
  ebookMonitorNewItems?: NewItemMonitorTypes | null;
  syncMonitoredAcrossFormats?: boolean | null;
  /** @format int32 */
  audiobookQualityProfileId?: number | null;
  /** @format int32 */
  ebookQualityProfileId?: number | null;
  /** @format int32 */
  metadataProfileId?: number | null;
  /** @format int32 */
  audiobookMetadataProfileId?: number | null;
  /** @format int32 */
  ebookMetadataProfileId?: number | null;
  audiobookRootFolderPath?: string | null;
  ebookRootFolderPath?: string | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  moveFiles?: boolean;
  deleteFiles?: boolean;
  deleteOtherAuthorsFiles?: boolean;
  mediaType?: string | null;
  applyToBothFormats?: boolean;
  addImportListExclusion?: boolean;
}

export interface AuthorImportResource {
  /** @format int32 */
  id?: number;
  foreignAuthorId?: string | null;
  authorName?: string | null;
  syncMonitoredAcrossFormats?: boolean | null;
  audiobookRootFolderPath?: string | null;
  /** @format int32 */
  audiobookQualityProfileId?: number | null;
  /** @format int32 */
  audiobookMetadataProfileId?: number | null;
  /** @uniqueItems true */
  audiobookTags?: number[] | null;
  ebookRootFolderPath?: string | null;
  /** @format int32 */
  ebookQualityProfileId?: number | null;
  /** @format int32 */
  ebookMetadataProfileId?: number | null;
  /** @uniqueItems true */
  ebookTags?: number[] | null;
  mediaType?: string | null;
  rootFolder?: string | null;
  /** @format int32 */
  qualityProfileId?: number;
  /** @format int32 */
  metadataProfileId?: number;
  monitor?: string | null;
  monitorExisting?: string | null;
  monitorFuture?: boolean | null;
  audiobookMonitored?: boolean | null;
  audiobookMonitorNewItems?: NewItemMonitorTypes | null;
  audiobookMonitorExistingMode?: MonitorTypes | null;
  ebookMonitored?: boolean | null;
  ebookMonitorNewItems?: NewItemMonitorTypes | null;
  ebookMonitorExistingMode?: MonitorTypes | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  manualFlag?: boolean;
  searchForMissingBooks?: boolean | null;
}

export interface AuthorPathUpdateResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  authorId?: number;
  oldPath?: string | null;
  newPath?: string | null;
  hasExistingFiles?: boolean;
  /** @format int32 */
  fileCount?: number;
}

export interface AuthorReleaseSearchResponse {
  /** @format date-time */
  startedAt?: string | null;
  /** @format date-time */
  finishedAt?: string | null;
  /** @format date-time */
  expiresAt?: string | null;
  /** @format int32 */
  commandId?: number | null;
  searchId?: string | null;
  /** @format int32 */
  authorId?: number;
  mediaType?: string | null;
  bookResults?: BookReleaseSearchResult[] | null;
  isComplete?: boolean;
  isCancelled?: boolean;
  isFailed?: boolean;
}

export interface AuthorReleaseSearchStopResponse {
  isStopping?: boolean;
  isRemoved?: boolean;
}

export interface AuthorResource {
  /** @format int32 */
  id?: number;
  status?: AuthorStatusType;
  ended?: boolean;
  authorName?: string | null;
  authorNameLastFirst?: string | null;
  foreignAuthorId?: string | null;
  titleSlug?: string | null;
  overview?: string | null;
  disambiguation?: string | null;
  /** @format date-time */
  born?: string | null;
  /** @format date-time */
  died?: string | null;
  links?: Links[] | null;
  nextBook?: BookResource | null;
  lastBook?: BookResource | null;
  images?: MediaCover[] | null;
  remotePoster?: string | null;
  path?: string | null;
  /** @format int32 */
  qualityProfileId?: number | null;
  /** @format int32 */
  audiobookQualityProfileId?: number | null;
  /** @format int32 */
  ebookQualityProfileId?: number | null;
  /** @format int32 */
  metadataProfileId?: number | null;
  /** @format int32 */
  audiobookMetadataProfileId?: number | null;
  /** @format int32 */
  ebookMetadataProfileId?: number | null;
  monitored?: boolean;
  audiobookMonitored?: boolean | null;
  audiobookMonitorExistingMode?: MonitorTypes | null;
  ebookMonitored?: boolean | null;
  ebookMonitorExistingMode?: MonitorTypes | null;
  audiobookMonitorNewItems?: NewItemMonitorTypes | null;
  ebookMonitorNewItems?: NewItemMonitorTypes | null;
  /** @format int32 */
  audiobookMonitorExisting?: number | null;
  audiobookMonitorFuture?: boolean | null;
  /** @format int32 */
  ebookMonitorExisting?: number | null;
  ebookMonitorFuture?: boolean | null;
  syncMonitoredAcrossFormats?: boolean | null;
  audiobookRootFolderPath?: string | null;
  ebookRootFolderPath?: string | null;
  rootFolderPath?: string | null;
  monitorNewItems?: string | null;
  folder?: string | null;
  audiobookFolder?: string | null;
  ebookFolder?: string | null;
  genres?: string[] | null;
  /** Author spellings supplied by the metadata server; submitted values are ignored. */
  pseudonyms?: string[] | null;
  cleanName?: string | null;
  sortName?: string | null;
  sortNameLastFirst?: string | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  /** @uniqueItems true */
  audiobookTags?: number[] | null;
  /** @uniqueItems true */
  ebookTags?: number[] | null;
  /** @format date-time */
  added?: string;
  addOptions?: AddAuthorOptions | null;
  initialScanPaths?: string[] | null;
  ratings?: Ratings | null;
  lastSelectedMediaType?: string | null;
  selectedPosterHash?: string | null;
  statistics?: AuthorStatisticsResource | null;
  audiobookStatistics?: AuthorStatisticsResource | null;
  ebookStatistics?: AuthorStatisticsResource | null;
  hydrationWarning?: string | null;
}

export interface AuthorStatisticsResource {
  /** @format int32 */
  bookFileCount?: number;
  /** @format int32 */
  bookCount?: number;
  /** @format int32 */
  availableBookCount?: number;
  /** @format int32 */
  totalBookCount?: number;
  /** @format int64 */
  sizeOnDisk?: number;
  /** @format double */
  percentOfBooks?: number;
}

export interface AuthorTitleInfo {
  title?: string | null;
  titleWithoutYear?: string | null;
  /** @format int32 */
  year?: number;
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
  includedComponents?: string[] | null;
  omittedComponents?: string[] | null;
}

export interface BackupStatus {
  pendingRestore?: boolean;
  canCancelRestore?: boolean;
  restoreFailed?: boolean;
  scheduleDisabled?: boolean;
  databaseBackupUnavailableReason?: string | null;
}

export interface BlocklistBulkResource {
  ids?: number[] | null;
}

export interface BlocklistResource {
  /** @format int32 */
  id?: number;
  authorProviderIds?: string[] | null;
  bookProviderIds?: string[] | null;
  sourceTitle?: string | null;
  quality?: QualityModel | null;
  customFormats?: CustomFormatResource[] | null;
  /** @format date-time */
  date?: string;
  protocol?: DownloadProtocol;
  indexer?: string | null;
  message?: string | null;
  /** @format int32 */
  authorId?: number | null;
  bookIds?: number[] | null;
  author?: AuthorResource | null;
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

export interface BookBucketResource {
  buckets?: Record<string, number> | null;
  /** @format int32 */
  totalCount?: number;
  cumulativeIndexes?: Record<string, number> | null;
  footerStatistics?: BookFooterStatistics | null;
}

export interface BookCoverCleanupResource {
  /** @format int64 */
  bytes?: number;
  /** @format int32 */
  bookCount?: number;
}

export interface BookEditorResource {
  bookIds?: number[] | null;
  monitored?: boolean | null;
  deleteFiles?: boolean | null;
  addImportListExclusion?: boolean | null;
  mediaType?: string | null;
}

export interface BookFileDeletePreviewRequest {
  bookFileIds?: number[] | null;
  bookIds?: number[] | null;
}

export interface BookFileDeletePreviewResource {
  files?: ManualImportReplacementFile[] | null;
  hasCalibreFiles?: boolean;
}

export interface BookFileListResource {
  bookFileIds?: number[] | null;
  audioProductionOverride?: boolean | null;
  quality?: QualityModel | null;
}

export interface BookFileResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  authorId?: number;
  /** @format int32 */
  bookId?: number;
  path?: string | null;
  /** @format int64 */
  size?: number;
  /** @format date-time */
  dateAdded?: string;
  audioProductionOverride?: boolean | null;
  quality?: QualityModel | null;
  /** @format int32 */
  qualityWeight?: number;
  /** @format int32 */
  indexerFlags?: number | null;
  mediaInfo?: MediaInfoResource | null;
  mediaType?: string | null;
  narrator?: string | null;
  isGraphicAudio?: boolean;
  tags?: Record<string, string[] | null>;
  matchProvenance?: MatchProvenance | null;
  importUnitKey?: string | null;
  importUnitRoot?: string | null;
  qualityCutoffNotMet?: boolean;
}

export interface BookFooterStatistics {
  /** @format int32 */
  totalBooks?: number;
  /** @format int32 */
  monitoredBooks?: number;
  /** @format int32 */
  fileCount?: number;
  /** @format int64 */
  totalFileSize?: number;
  /** @format int32 */
  authorCount?: number;
}

export interface BookImportAuthorMonitoring {
  monitor?: string | null;
  monitorExisting?: string | null;
  monitorFuture?: boolean | null;
  audiobookMonitored?: boolean | null;
  audiobookMonitorNewItems?: NewItemMonitorTypes | null;
  audiobookMonitorExistingMode?: MonitorTypes | null;
  ebookMonitored?: boolean | null;
  ebookMonitorNewItems?: NewItemMonitorTypes | null;
  ebookMonitorExistingMode?: MonitorTypes | null;
  searchForMissing?: boolean;
}

export interface BookImportResource {
  /** @format int32 */
  id?: number;
  foreignBookId?: string | null;
  foreignAuthorId?: string | null;
  authorName?: string | null;
  foreignEditionId?: string | null;
  mediaType?: string | null;
  rootFolder?: string | null;
  /** @format int32 */
  qualityProfileId?: number;
  /** @format int32 */
  metadataProfileId?: number;
  authorMonitoring?: BookImportAuthorMonitoring | null;
}

export interface BookLocalInstanceResource {
  /** @format int32 */
  id?: number;
  title?: string | null;
  titleSlug?: string | null;
  mediaType?: string | null;
  narrator?: string | null;
  disambiguation?: string | null;
  monitored?: boolean;
  hasFiles?: boolean;
}

export interface BookNarratorInheritanceInfo {
  /** @format int32 */
  bookId?: number;
  bookTitle?: string | null;
  currentNarrator?: string | null;
  canInheritFromSeries?: boolean;
}

export interface BookReleaseSearchResult {
  /** @format int32 */
  indexersQueried?: number;
  /** @format int32 */
  indexersFailed?: number;
  /** @format int32 */
  bookId?: number;
  title?: string | null;
  mediaType?: string | null;
  status?: string | null;
  releases?: ReleaseResource[] | null;
  hiddenReleases?: ReleaseResource[] | null;
}

export interface BookResource {
  /** @format int32 */
  id?: number;
  title?: string | null;
  authorTitle?: string | null;
  seriesTitle?: string | null;
  /** Ordered labels for all same-media Goodreads series memberships; submitted changes are ignored. */
  seriesLabels?: string[] | null;
  disambiguation?: string | null;
  overview?: string | null;
  /** @format int32 */
  authorId?: number;
  foreignBookId?: string | null;
  localBookId?: string | null;
  foreignEditionId?: string | null;
  baseBookId?: string | null;
  /** An existing copy of this provider edition (on any audiobook row of the same work) was returned unchanged; nothing was changed or searched. */
  existingCopy?: boolean | null;
  hardcoverBookId?: string | null;
  goodreadsBookId?: string | null;
  goodreadsWorkId?: string | null;
  openLibraryWorkId?: string | null;
  googleBooksId?: string | null;
  asin?: string | null;
  audibleASIN?: string | null;
  titleSlug?: string | null;
  monitored?: boolean;
  audiobookMonitored?: boolean | null;
  ebookMonitored?: boolean | null;
  anyEditionOk?: boolean;
  /** Provider metadata; changes submitted to PUT are ignored. */
  ratings?: Ratings | null;
  /**
   * Provider metadata; changes submitted to PUT are ignored.
   * @format date-time
   */
  releaseDate?: string | null;
  /** @format date-time */
  added?: string;
  /** @format int32 */
  pageCount?: number;
  genres?: string[] | null;
  author?: AuthorResource | null;
  images?: MediaCover[] | null;
  links?: Links[] | null;
  statistics?: BookStatisticsResource | null;
  addOptions?: AddBookOptions | null;
  remoteCover?: string | null;
  bookFiles?: BookFileResource[] | null;
  editions?: EditionResource[] | null;
  localAudiobookBooks?: BookLocalInstanceResource[] | null;
  localEbookBooks?: BookLocalInstanceResource[] | null;
  mediaType?: string | null;
  instanceCombinedId?: string | null;
  narrator?: string | null;
  availableNarrators?: string[] | null;
  availableNarratorCredits?: NarratorResource[] | null;
  narratorNames?: string[] | null;
  narrators?: NarratorResource[] | null;
  /** @format date-span */
  duration?: string | null;
  /**
   * Provider metadata; changes submitted to PUT are ignored.
   * @format double
   */
  durationMinutes?: number | null;
  hasFiles?: boolean;
  isOmnibus?: boolean;
  formats?: string[] | null;
  fileSizeOnDisk?: string | null;
  grabbed?: boolean;
}

export interface BookResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: BookResource[] | null;
}

export interface BookSiblingDeleteInfoResource {
  siblingMediaType?: string | null;
  bookIds?: number[] | null;
  currentBook?: BookSiblingDetailResource | null;
  siblings?: BookSiblingDetailResource[] | null;
  statistics?: BookSiblingStatisticsResource | null;
  /** @format int32 */
  audiobookCount?: number;
  /** @format int32 */
  ebookCount?: number;
}

export interface BookSiblingDetailResource {
  /** @format int32 */
  bookId?: number;
  mediaType?: string | null;
  title?: string | null;
  files?: BookSiblingFileResource[] | null;
}

export interface BookSiblingFileResource {
  path?: string | null;
  /** @format int64 */
  size?: number;
}

export interface BookSiblingStatisticsResource {
  /** @format int32 */
  bookFileCount?: number;
  /** @format int64 */
  sizeOnDisk?: number;
}

export interface BookStatisticsResource {
  /** @format int32 */
  bookFileCount?: number;
  /** @format int32 */
  bookCount?: number;
  /** @format int32 */
  availableBookCount?: number;
  /** @format int32 */
  totalBookCount?: number;
  /** @format int64 */
  sizeOnDisk?: number;
  /** @format double */
  percentOfBooks?: number;
}

export interface BooksMonitoredResource {
  bookIds?: number[] | null;
  monitored?: boolean;
}

export interface BookshelfAuthorResource {
  /** @format int32 */
  id?: number;
  monitored?: boolean | null;
  books?: BookResource[] | null;
}

export interface BookshelfMonitoringOptionsResource {
  monitor?: MonitorTypes | null;
  mediaType?: BookMediaType | null;
  booksToMonitor?: string[] | null;
}

export interface BookshelfResource {
  authors?: BookshelfAuthorResource[] | null;
  monitoringOptions?: BookshelfMonitoringOptionsResource | null;
  monitorNewItems?: NewItemMonitorTypes | null;
}

export interface Command {
  sendUpdatesToClient?: boolean;
  updateScheduledTask?: boolean;
  completionMessage?: string | null;
  requiresDiskAccess?: boolean;
  diskAccessGroup?: string | null;
  isExclusive?: boolean;
  isTypeExclusive?: boolean;
  isLongRunning?: boolean;
  supportsCancellation?: boolean;
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
  body?: Command | null;
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

export interface CompileRequest {
  ast?: PatternAst | null;
}

export interface ConversionConfigResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  audiobookConversionConcurrentConversions?: number;
  /** @format int32 */
  audiobookConversionMaxBitrate?: number;
  /** @format int32 */
  audiobookConversionMaxCpuThreads?: number;
  audiobookConversionNoUpscale?: boolean;
  audiobookConversionAudioChannels?: string | null;
  audiobookConversionTagMode?: string | null;
  ebookConversionEnabled?: boolean;
  ebookConversionTargetFormat?: string | null;
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
  builtInKey?: string | null;
  appliesTo?: CustomFormatMediaType;
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

export interface DecompileRequest {
  pattern?: string | null;
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

export interface DevelopmentConfigResource {
  /** @format int32 */
  id?: number;
  metadataServerUrl?: string | null;
  consoleLogLevel?: string | null;
  logSql?: boolean;
  /** @format int32 */
  logRotate?: number;
  filterSentryEvents?: boolean;
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
  definitionName?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  presets?: DownloadClientResource[] | null;
  enable?: boolean;
  protocol?: DownloadProtocol;
  /** @format int32 */
  priority?: number;
  /** @uniqueItems true */
  audiobookTags?: number[] | null;
  /** @uniqueItems true */
  ebookTags?: number[] | null;
  removeCompletedDownloads?: boolean;
  removeFailedDownloads?: boolean;
  copyUnmanagedDownloads?: boolean;
}

export interface EditionChapterResource {
  title?: string | null;
  /** @format int32 */
  startOffsetMs?: number;
  /** @format int32 */
  startOffsetSec?: number;
  /** @format int32 */
  lengthMs?: number;
}

export interface EditionResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  bookId?: number;
  foreignEditionId?: string | null;
  titleSlug?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  asin?: string | null;
  asins?: string[] | null;
  title?: string | null;
  subtitle?: string | null;
  language?: string | null;
  overview?: string | null;
  format?: string | null;
  isEbook?: boolean;
  disambiguation?: string | null;
  publisher?: string | null;
  /** @format int32 */
  pageCount?: number;
  /** @format date-time */
  releaseDate?: string | null;
  images?: MediaCover[] | null;
  links?: Links[] | null;
  ratings?: Ratings | null;
  monitored?: boolean;
  manualAdd?: boolean;
  /** @format int64 */
  goodreadsEditionId?: number | null;
  hardcoverEditionId?: string | null;
  openLibraryEditionId?: string | null;
  /** @format int32 */
  readingFormatId?: number | null;
  editionFormat?: string | null;
  editionInfo?: string | null;
  audibleASIN?: string | null;
  googleBooksEditionId?: string | null;
  /** @format int32 */
  bookFileCount?: number;
  /** @format int32 */
  existingCopyId?: number | null;
  existingCopyMonitored?: boolean | null;
  remoteCover?: string | null;
  narrator?: string | null;
  narratorNames?: string[] | null;
  narrators?: NarratorResource[] | null;
  /** @format int32 */
  durationSeconds?: number | null;
  /** @format int32 */
  chapterCount?: number | null;
  hasChapters?: boolean;
  /** @format int32 */
  reviewCount?: number | null;
  chapters?: EditionChapterResource[] | null;
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
  privacy?: string | null;
  value?: any | null;
  type?: string | null;
  advanced?: boolean;
  selectOptions?: SelectOption[] | null;
  selectOptionsProviderAction?: string | null;
  section?: string | null;
  hidden?: string | null;
  placeholder?: string | null;
  isFloat?: boolean;
}

export interface FilterSummary {
  /** @format int32 */
  totalResults?: number;
  /** @format int32 */
  filteredCount?: number;
  /** @format int32 */
  displayedCount?: number;
  /** @format int32 */
  hardFilteredCount?: number;
  /** @format int32 */
  softFilteredCount?: number;
  hasSoftFilters?: boolean;
  hasHardFilters?: boolean;
  bypassMode?: boolean;
  filteredCategories?: string[] | null;
  filterBreakdown?: Record<string, number> | null;
  summaryText?: string | null;
  filterWarnings?: string[] | null;
}

export interface HardcoverConfigResource {
  enabled?: boolean;
  hasToken?: boolean;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface HardcoverTokenRequest {
  token?: string | null;
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
  bookId?: number;
  /** @format int32 */
  authorId?: number;
  sourceTitle?: string | null;
  quality?: QualityModel | null;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  qualityCutoffNotMet?: boolean;
  /** @format date-time */
  date?: string;
  downloadId?: string | null;
  eventType?: EntityHistoryEventType;
  data?: Record<string, string | null>;
  book?: BookResource | null;
  author?: AuthorResource | null;
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
  allowedHosts?: string | null;
  /** @format int32 */
  port?: number;
  /** @format int32 */
  sslPort?: number;
  enableSsl?: boolean;
  launchBrowser?: boolean;
  authenticationMethod?: AuthenticationType;
  authenticationRequired?: AuthenticationRequiredType;
  username?: string | null;
  password?: string | null;
  passwordConfirmation?: string | null;
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
  proxyMode?: ProxyMode;
  /** @format int32 */
  globalProxyId?: number | null;
  proxyType?: ProxyType;
  proxyHostname?: string | null;
  /** @format int32 */
  proxyPort?: number;
  proxyUsername?: string | null;
  proxyPassword?: string | null;
  proxyBypassFilter?: string | null;
  proxyBypassLocalAddresses?: boolean;
  proxyName?: string | null;
  certificateValidation?: CertificateValidationType;
  backupFolder?: string | null;
  /** @format int32 */
  backupInterval?: number;
  /** @format int32 */
  backupRetention?: number;
  backupIncludeLogsAndCache?: boolean;
  trustCgnatIpAddresses?: boolean;
  oidcAuthority?: string | null;
  oidcClientId?: string | null;
  oidcClientSecret?: string | null;
  oidcScopes?: string | null;
  oidcAllowedEmails?: string | null;
  oidcAllowedEmailDomains?: string | null;
  oidcRequireEmailVerified?: boolean;
  oidcAllowAnyVerifiedUser?: boolean;
}

export interface IgnoredDownloadBulkResource {
  ids?: number[] | null;
}

export interface IgnoredDownloadResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  authorId?: number;
  /** @format int32 */
  bookId?: number;
  downloadId?: string | null;
  sourceTitle?: string | null;
  /** @format date-time */
  date?: string;
  protocol?: DownloadProtocol;
  /** @format int32 */
  downloadClientId?: number;
  downloadClient?: string | null;
  downloadClientName?: string | null;
  isInClient?: boolean;
}

export interface IgnoredDownloadResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: IgnoredDownloadResource[] | null;
}

export interface ImportListBulkResource {
  ids?: number[] | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
  enableAutomaticAdd?: boolean | null;
  rootFolderPath?: string | null;
  /** @format int32 */
  qualityProfileId?: number | null;
  /** @format int32 */
  metadataProfileId?: number | null;
}

export interface ImportListExclusionBulkResource {
  /** @uniqueItems true */
  ids?: number[] | null;
}

export interface ImportListExclusionResource {
  /** @format int32 */
  id?: number;
  foreignId?: string | null;
  authorName?: string | null;
  mediaType?: string | null;
}

export interface ImportListMonitoringOptions {
  addMissingAuthors?: boolean;
  resumePausedAuthors?: boolean;
  audiobookMonitored?: boolean | null;
  ebookMonitored?: boolean | null;
  audiobookMonitorListedBooks?: boolean | null;
  ebookMonitorListedBooks?: boolean | null;
  audiobookMonitor?: MonitorTypes | null;
  ebookMonitor?: MonitorTypes | null;
  audiobookMonitorNewItems?: NewItemMonitorTypes | null;
  ebookMonitorNewItems?: NewItemMonitorTypes | null;
}

export interface ImportListResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  definitionName?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage | null;
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
  monitoringOptions?: ImportListMonitoringOptions | null;
  listType?: ImportListType;
  /** @format date-span */
  minRefreshInterval?: string;
  hardcoverUsername?: string | null;
  hardcoverAvatarUrl?: string | null;
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
  definitionName?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  presets?: IndexerResource[] | null;
  enable?: boolean;
  enableRss?: boolean;
  enableAutomaticSearch?: boolean;
  enableInteractiveSearch?: boolean;
  supportsRss?: boolean;
  supportsSearch?: boolean;
  supportsNarratorMetadata?: boolean | null;
  protocol?: DownloadProtocol;
  /** @format int32 */
  priority?: number;
  /** @format int32 */
  downloadClientId?: number;
  /** @format int32 */
  proxyId?: number | null;
}

export interface LanguageResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  nameLower?: string | null;
}

export interface LibrarySearchAuthor {
  /** @format int32 */
  id?: number;
  exactMatch?: boolean;
  name?: string | null;
  images?: MediaCover[] | null;
  selectedPosterHash?: string | null;
}

export interface LibrarySearchBook {
  /** @format int32 */
  id?: number;
  exactMatch?: boolean;
  title?: string | null;
  matchedEditionTitle?: string | null;
  titleSlug?: string | null;
  mediaType?: string | null;
  /** @format int32 */
  authorId?: number;
  authorName?: string | null;
  monitored?: boolean;
  images?: MediaCover[] | null;
  foreignBookId?: string | null;
  foreignAuthorId?: string | null;
  hardcoverBookId?: string | null;
  goodreadsBookId?: string | null;
  goodreadsWorkId?: string | null;
  openLibraryWorkId?: string | null;
  googleBooksId?: string | null;
  asin?: string | null;
  audibleASIN?: string | null;
  hardcoverAuthorId?: string | null;
  goodreadsAuthorId?: string | null;
  openLibraryAuthorId?: string | null;
  googleBooksAuthorId?: string | null;
  audnexusAuthorId?: string | null;
  localAudiobookBooks?: LibrarySearchBookInstance[] | null;
  localEbookBooks?: LibrarySearchBookInstance[] | null;
}

export interface LibrarySearchBookInstance {
  /** @format int32 */
  id?: number;
  title?: string | null;
  titleSlug?: string | null;
  mediaType?: string | null;
  narrator?: string | null;
  monitored?: boolean;
  hasFiles?: boolean;
}

export interface LibrarySearchResult {
  authors?: LibrarySearchAuthor[] | null;
  books?: LibrarySearchBook[] | null;
}

export interface LinkAuthorRequest {
  /** @format int32 */
  authorId?: number;
  folderPath?: string | null;
}

export interface Links {
  url?: string | null;
  name?: string | null;
}

export interface LoadImageRequest {
  imageUrl?: string | null;
}

export interface LoadImageResponseResource {
  status?: string | null;
  localPath?: string | null;
  errorCode?: string | null;
  message?: string | null;
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

export interface ManualImportReplacementFile {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  bookId?: number;
  path?: string | null;
  /** @format int32 */
  editionId?: number;
  editionTitle?: string | null;
  narrator?: string | null;
  quality?: string | null;
  mediaType?: string | null;
  retentionReason?: string | null;
  isGraphicAudio?: boolean;
  audioProductionType?: string | null;
  isPermanentDelete?: boolean;
  associatedPaths?: string[] | null;
}

export interface ManualImportReplacementRequest {
  files?: ManualImportReplacementSelection[] | null;
}

export interface ManualImportReplacementSelection {
  path?: string | null;
  /** @format int32 */
  bookId?: number;
}

export interface ManualImportResource {
  /** @format int32 */
  id?: number;
  path?: string | null;
  name?: string | null;
  /** @format int64 */
  size?: number;
  author?: AuthorResource | null;
  book?: BookResource | null;
  edition?: EditionResource | null;
  /** @format int32 */
  editionId?: number | null;
  foreignEditionId?: string | null;
  suggestedForeignAuthorId?: string | null;
  suggestedAuthorName?: string | null;
  suggestedForeignBookId?: string | null;
  suggestedBookTitle?: string | null;
  suggestedForeignEditionId?: string | null;
  suggestedEditionTitle?: string | null;
  customFormats?: CustomFormatResource[] | null;
  quality?: QualityModel | null;
  releaseGroup?: string | null;
  audioProductionOverride?: boolean | null;
  isGraphicAudio?: boolean;
  /** @format int32 */
  qualityWeight?: number;
  downloadId?: string | null;
  /** @format int32 */
  indexerFlags?: number;
  rejections?: Rejection[] | null;
  warnings?: string[] | null;
  tags?: Record<string, string[] | null>;
  additionalFile?: boolean;
  selectByDefault?: boolean | null;
  replaceExistingFiles?: boolean;
  disableReleaseSwitching?: boolean;
}

export interface ManualImportUpdateResource {
  /** @format int32 */
  id?: number;
  path?: string | null;
  name?: string | null;
  /** @format int32 */
  authorId?: number | null;
  /** @format int32 */
  bookId?: number | null;
  /** @format int32 */
  editionId?: number | null;
  suggestedForeignAuthorId?: string | null;
  suggestedAuthorName?: string | null;
  suggestedForeignBookId?: string | null;
  suggestedBookTitle?: string | null;
  suggestedForeignEditionId?: string | null;
  suggestedEditionTitle?: string | null;
  quality?: QualityModel | null;
  releaseGroup?: string | null;
  audioProductionOverride?: boolean | null;
  /** @format int32 */
  indexerFlags?: number;
  downloadId?: string | null;
  additionalFile?: boolean;
  replaceExistingFiles?: boolean;
  disableReleaseSwitching?: boolean;
  rejections?: Rejection[] | null;
  warnings?: string[] | null;
}

export interface MatchEvidenceRange {
  /** @format int32 */
  start?: number;
  /** @format int32 */
  end?: number;
  disposition?: string | null;
  type?: string | null;
  scope?: string | null;
  detail?: string | null;
}

export interface MatchEvidenceValue {
  source?: string | null;
  value?: string | null;
  fields?: string[] | null;
  ranges?: MatchEvidenceRange[] | null;
}

export interface MatchProvenance {
  /** @format int32 */
  schemaVersion?: number;
  matcherVersion?: string | null;
  decisionId?: string | null;
  /** @format date-time */
  matchedAtUtc?: string;
  mode?: string | null;
  route?: string | null;
  matchedVia?: string | null;
  selectionSource?: string | null;
  summary?: string | null;
  authorProviderIds?: string[] | null;
  bookProviderIds?: string[] | null;
  editionProviderIds?: string[] | null;
  supportingSignals?: MatchSignal[] | null;
  conflictingSignals?: MatchSignal[] | null;
  neutralSignals?: MatchSignal[] | null;
  excludedSignals?: MatchSignal[] | null;
  evidenceValues?: MatchEvidenceValue[] | null;
  importDownloadId?: string | null;
  importSourcePaths?: string[] | null;
  importExcludedSourcePaths?: string[] | null;
}

export interface MatchSignal {
  type?: string | null;
  scope?: string | null;
  source?: string | null;
  field?: string | null;
  observed?: string | null;
  expected?: string | null;
  detail?: string | null;
}

export interface MatchingLogPreviewEntryResource {
  /** @format int64 */
  timestamp?: number;
  path?: string | null;
  fileName?: string | null;
  mediaType?: string | null;
  success?: boolean;
  reason?: string | null;
  decision?: string | null;
  authorMatched?: string | null;
  bookMatched?: string | null;
  editionMatched?: string | null;
  matchedVia?: string | null;
  matchedEditionTitle?: string | null;
  topRejectionReason?: string | null;
  topRejectionDetail?: string | null;
  topRejectionTitle?: string | null;
  uploadEntryJson?: string | null;
  tags?: Record<string, string[] | null>;
}

export interface MatchingLogPreviewResource {
  /** @format int32 */
  totalEntries?: number;
  /** @format int32 */
  sampleCount?: number;
  /** @format int32 */
  maxEntries?: number;
  /** @format int32 */
  minutesBack?: number;
  failedMatchesOnly?: boolean;
  mediaType?: string | null;
  scope?: string | null;
  /** @format int32 */
  logsRotateMinutes?: number;
  samples?: MatchingLogPreviewEntryResource[] | null;
}

export interface MediaCover {
  url?: string | null;
  coverType?: MediaCoverTypes;
  extension?: string | null;
  remoteUrl?: string | null;
  temporaryUrl?: string | null;
  hash?: string | null;
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
  autoUnmonitorPreviouslyDownloadedBooks?: boolean;
  coverDownloadScope?: CoverDownloadScope;
  recycleBin?: string | null;
  /** @format int32 */
  recycleBinCleanupDays?: number;
  downloadPropersAndRepacks?: ProperDownloadTypes;
  createEmptyAuthorFolders?: boolean;
  createEmptyEbookAuthorFolders?: boolean;
  deleteEmptyFolders?: boolean;
  fileDate?: FileDateType;
  watchLibraryForChanges?: boolean;
  granularFileSystemScanning?: boolean;
  rescanAfterRefresh?: RescanAfterRefreshType;
  allowFingerprinting?: AllowFingerprinting;
  bookMatchingStrictness?: BookMatchingStrictness;
  usePathAsTagsFallback?: boolean;
  autoAddMissingAuthorsFromCompletedDownloads?: boolean;
  defaultAudiobookRootFolderPath?: string | null;
  defaultEbookRootFolderPath?: string | null;
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

export interface MediaTypeConfig {
  monitor?: boolean;
  /** @format int32 */
  monitorExisting?: number | null;
  monitorFuture?: boolean | null;
  monitorNewItems?: NewItemMonitorTypes | null;
  monitorExistingMode?: MonitorTypes | null;
  /** @format int32 */
  qualityProfileId?: number | null;
  /** @format int32 */
  metadataProfileId?: number | null;
  rootFolderPath?: string | null;
  booksToMonitor?: string[] | null;
  /** @uniqueItems true */
  tags?: number[] | null;
}

export interface MediaTypeSettingsResource {
  /** @format int32 */
  qualityProfileId?: number | null;
  /** @format int32 */
  metadataProfileId?: number | null;
  monitored?: boolean | null;
  monitorExistingMode?: MonitorTypes | null;
  monitorExistingBooks?: boolean | null;
  /** @format int32 */
  monitorExisting?: number | null;
  monitorFuture?: boolean | null;
  monitorNewItems?: NewItemMonitorTypes | null;
  writeAudioBookShelfMetadataJson?: boolean;
  writeAudioBookShelfCover?: boolean;
  tags?: number[] | null;
}

export interface MetadataProfileResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  /** @format int32 */
  profileType?: number;
  /** @format double */
  minPopularity?: number;
  skipMissingDate?: boolean;
  skipMissingIsbn?: boolean;
  skipPartsAndSets?: boolean;
  skipSeriesSecondary?: boolean;
  skipMissingIdentifierOmnibus?: boolean;
  skipOmnibus?: boolean;
  skipMissingAsin?: boolean;
  allowedLanguages?: string | null;
  /** @format int32 */
  minPages?: number;
  ignored?: string[] | null;
}

export interface MetadataProviderConfigResource {
  /** @format int32 */
  id?: number;
  writeAudioTags?: WriteAudioTagsType;
  scrubAudioTags?: boolean;
  writeBookTags?: WriteBookTagsType;
  updateCovers?: boolean;
  embedMetadata?: boolean;
}

export interface MetadataResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  definitionName?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  presets?: MetadataResource[] | null;
  enable?: boolean;
}

export interface MonitoringResource {
  monitored?: boolean;
}

export interface NamingConfigResource {
  /** @format int32 */
  id?: number;
  renameBooks?: boolean;
  replaceIllegalCharacters?: boolean;
  /** @format int32 */
  colonReplacementFormat?: number;
  standardBookFormat?: string | null;
  authorFolderFormat?: string | null;
  ebookRenameBooks?: boolean | null;
  ebookReplaceIllegalCharacters?: boolean | null;
  /** @format int32 */
  ebookColonReplacementFormat?: number | null;
  ebookStandardBookFormat?: string | null;
  ebookAuthorFolderFormat?: string | null;
  includeAuthorName?: boolean;
  includeBookTitle?: boolean;
  includeQuality?: boolean;
  replaceSpaces?: boolean;
  separator?: string | null;
  numberStyle?: string | null;
}

export interface NarratorAnalysisResource {
  narrator?: string | null;
  /** @format int32 */
  bookCount?: number;
  /** @format double */
  percentage?: number;
  hasSequentialOverlap?: boolean;
  isMainNarrator?: boolean;
  isSporadicNarrator?: boolean;
}

export interface NarratorDiscoveryInfoResource {
  narratorName?: string | null;
  /** @format int32 */
  bookCount?: number;
  /** @format int32 */
  totalBooksInSeries?: number;
  /** @format double */
  averageRating?: number;
  hasCompleteSet?: boolean;
  bookTitles?: string[] | null;
  hasExistingVariant?: boolean;
}

export interface NarratorResource {
  name?: string | null;
  isCastLabel?: boolean;
}

export interface NotificationBulkResource {
  ids?: number[] | null;
  tags?: number[] | null;
  applyTags?: ApplyTags;
}

export interface NotificationResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  fields?: Field[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  definitionName?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  message?: ProviderMessage | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  presets?: NotificationResource[] | null;
  enable?: boolean;
  link?: string | null;
  onGrab?: boolean;
  onReleaseImport?: boolean;
  onUpgrade?: boolean;
  onRename?: boolean;
  onAuthorAdded?: boolean;
  onBookAdded?: boolean;
  onAuthorDelete?: boolean;
  onBookDelete?: boolean;
  onBookFileDelete?: boolean;
  onBookFileDeleteForUpgrade?: boolean;
  onHealthIssue?: boolean;
  onDownloadFailure?: boolean;
  onImportFailure?: boolean;
  onBookRetag?: boolean;
  onApplicationUpdate?: boolean;
  supportsOnGrab?: boolean;
  supportsOnReleaseImport?: boolean;
  supportsOnUpgrade?: boolean;
  supportsOnRename?: boolean;
  supportsOnAuthorAdded?: boolean;
  supportsOnBookAdded?: boolean;
  supportsOnAuthorDelete?: boolean;
  supportsOnBookDelete?: boolean;
  supportsOnBookFileDelete?: boolean;
  supportsOnBookFileDeleteForUpgrade?: boolean;
  supportsOnHealthIssue?: boolean;
  includeHealthWarnings?: boolean;
  supportsOnDownloadFailure?: boolean;
  supportsOnImportFailure?: boolean;
  supportsOnBookRetag?: boolean;
  supportsOnApplicationUpdate?: boolean;
  testCommand?: string | null;
  audioBookShelfLibraryMappings?: AudioBookShelfLibraryMapping[] | null;
  audioBookShelfLibraryMappingsConfigured?: boolean;
  legacyAudiobookLibraryId?: string | null;
  legacyEbookLibraryId?: string | null;
}

export interface PagedBookApiResource {
  records?: BookResource[] | null;
  /** @format int32 */
  totalCount?: number;
  /** @format int32 */
  offset?: number;
  /** @format int32 */
  pageSize?: number;
}

export interface ParseResource {
  /** @format int32 */
  id?: number;
  title?: string | null;
  parsedBookInfo?: ParsedBookInfo | null;
  author?: AuthorResource | null;
  books?: BookResource[] | null;
}

export interface ParsedBookInfo {
  bookTitle?: string | null;
  authorName?: string | null;
  authorTitleInfo?: AuthorTitleInfo | null;
  quality?: QualityModel | null;
  releaseDate?: string | null;
  discography?: boolean;
  /** @format int32 */
  discographyStart?: number;
  /** @format int32 */
  discographyEnd?: number;
  releaseGroup?: string | null;
  releaseHash?: string | null;
  releaseVersion?: string | null;
  releaseTitle?: string | null;
  isGraphicAudio?: boolean;
  audioProductionType?: string | null;
  narrator?: string | null;
}

export interface PatternAst {
  nodesById?: Record<string, PatternNode> | null;
  rootIds?: string[] | null;
}

export interface PatternNode {
  id?: string | null;
  kind?: string | null;
}

export interface PendingAuthorExistenceResource {
  exists?: boolean;
  /** @format int32 */
  authorId?: number | null;
  authorName?: string | null;
  pending?: boolean;
  /** @format int32 */
  pendingId?: number | null;
  status?: string | null;
  /** @format date-time */
  nextAttempt?: string | null;
  /** @format int32 */
  attemptCount?: number | null;
}

export interface PendingAuthorImportResource {
  /** @format int32 */
  id?: number;
  providerId?: string | null;
  providerPrefix?: string | null;
  authorName?: string | null;
  audiobookStatus?: string | null;
  ebookStatus?: string | null;
  overallStatus?: string | null;
  audiobookMonitored?: boolean | null;
  audiobookMonitorNewItems?: NewItemMonitorTypes | null;
  audiobookMonitorExistingMode?: MonitorTypes | null;
  /** @format int32 */
  audiobookQualityProfileId?: number | null;
  /** @format int32 */
  audiobookMetadataProfileId?: number | null;
  audiobookRootFolderPath?: string | null;
  audiobookBooksToMonitor?: string[] | null;
  audiobookBooksToSearch?: string[] | null;
  /** @uniqueItems true */
  audiobookTags?: number[] | null;
  ebookMonitored?: boolean | null;
  ebookMonitorNewItems?: NewItemMonitorTypes | null;
  ebookMonitorExistingMode?: MonitorTypes | null;
  /** @format int32 */
  ebookQualityProfileId?: number | null;
  /** @format int32 */
  ebookMetadataProfileId?: number | null;
  ebookRootFolderPath?: string | null;
  ebookBooksToMonitor?: string[] | null;
  ebookBooksToSearch?: string[] | null;
  /** @uniqueItems true */
  ebookTags?: number[] | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  searchForMissingBooks?: boolean;
  lastSelectedMediaType?: string | null;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string | null;
  /** @format date-time */
  lastAttemptAt?: string | null;
  /** @format date-time */
  nextAttemptAt?: string;
  /**
   * Observational retry count; it is not a terminal-failure threshold.
   * @format int32
   */
  attemptCount?: number;
  /**
   * Zero means the transient/not-ready retry lifecycle is unbounded. Typed 404/409 outcomes stop automatic retrying instead.
   * @format int32
   */
  maxAttempts?: number;
  lastError?: string | null;
  requestedBy?: string | null;
  sourceApplication?: string | null;
  correlationId?: string | null;
}

export interface PendingAuthorImportResourcePagingResource {
  /** @format int32 */
  page?: number;
  /** @format int32 */
  pageSize?: number;
  sortKey?: string | null;
  sortDirection?: SortDirection;
  /** @format int32 */
  totalRecords?: number;
  records?: PendingAuthorImportResource[] | null;
}

export interface PendingBookRequestResource {
  /** @format int32 */
  pendingId?: number;
  message?: string | null;
}

export interface PendingImportMediaProfileOptionsResource {
  qualityProfiles?: PendingImportProfileOptionResource[] | null;
  metadataProfiles?: PendingImportProfileOptionResource[] | null;
  rootFolders?: PendingImportRootFolderOptionResource[] | null;
}

export interface PendingImportProfileOptionResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export interface PendingImportProfileOptionsResource {
  audiobook?: PendingImportMediaProfileOptionsResource | null;
  ebook?: PendingImportMediaProfileOptionsResource | null;
  all?: PendingImportMediaProfileOptionsResource | null;
}

export interface PendingImportRootFolderOptionResource {
  path?: string | null;
  name?: string | null;
}

export interface PingResource {
  status?: string | null;
}

export interface PreviewRequest {
  pattern?: string | null;
  ast?: PatternAst | null;
  sample?: SampleContext | null;
}

export interface ProblemDetails {
  type?: string | null;
  title?: string | null;
  /** @format int32 */
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  [key: string]: any;
}

export interface ProfileFormatItemResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  format?: number;
  builtInKey?: string | null;
  name?: string | null;
  /** @format int32 */
  score?: number;
}

export interface ProviderAmbiguityCandidateResource {
  /** @format int32 */
  id?: number;
  entityType?: string | null;
  title?: string | null;
  authorName?: string | null;
  titleSlug?: string | null;
  foreignAuthorId?: string | null;
  mediaType?: string | null;
  narrator?: string | null;
  disambiguation?: string | null;
  monitored?: boolean | null;
  hasFiles?: boolean | null;
}

export interface ProviderAmbiguityResource {
  error?: string | null;
  message?: string | null;
  entityType?: string | null;
  field?: string | null;
  providerId?: string | null;
  mediaType?: string | null;
  candidates?: ProviderAmbiguityCandidateResource[] | null;
}

export interface ProviderMessage {
  message?: string | null;
  type?: ProviderMessageType;
}

export interface ProxyResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  type?: ProxyType;
  hostname?: string | null;
  /** @format int32 */
  port?: number;
  username?: string | null;
  password?: string | null;
}

export interface ProxyTestRequest {
  proxyHostname?: string | null;
  /** @format int32 */
  proxyPort?: number;
  proxyType?: ProxyType;
  proxyUsername?: string | null;
  proxyPassword?: string | null;
}

export interface ProxyTestResult {
  isValid?: boolean;
  message?: string | null;
  /** @format date-span */
  responseTime?: string | null;
}

export interface Quality {
  /** @format int32 */
  id?: number;
  name?: string | null;
  isConversionTarget?: boolean;
}

export interface QualityDefinitionResource {
  /** @format int32 */
  id?: number;
  quality?: Quality | null;
  title?: string | null;
  groupName?: string | null;
  /** @format int32 */
  groupWeight?: number;
  /** @format int32 */
  weight?: number;
  /** @format double */
  minSize?: number | null;
  /** @format double */
  maxSize?: number | null;
}

export interface QualityModel {
  quality?: Quality | null;
  revision?: Revision | null;
}

export interface QualityProfileQualityItemResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  quality?: Quality | null;
  items?: QualityProfileQualityItemResource[] | null;
  allowed?: boolean;
}

export interface QualityProfileResource {
  /** @format int32 */
  id?: number;
  name?: string | null;
  profileType?: ProfileType;
  upgradeAllowed?: boolean;
  confirmAutomaticUpgrades?: boolean;
  preferCustomFormatsOverQuality?: boolean;
  convertMp3ToM4b?: boolean;
  /** @format int32 */
  convertToQualityId?: number | null;
  /** @format int32 */
  cutoff?: number;
  items?: QualityProfileQualityItemResource[] | null;
  /** @format int32 */
  minFormatScore?: number;
  /** @format int32 */
  cutoffFormatScore?: number;
  formatItems?: ProfileFormatItemResource[] | null;
}

export interface QueueAuthorRequest {
  providerId?: string | null;
  authorName?: string | null;
  audiobook?: MediaTypeConfig | null;
  ebook?: MediaTypeConfig | null;
  /** @uniqueItems true */
  tags?: number[] | null;
  searchForMissingBooks?: boolean | null;
  sourceApplication?: string | null;
  requestedBy?: string | null;
}

export interface QueueAuthorResponseResource {
  /** @format int32 */
  pendingId?: number;
  message?: string | null;
  providerId?: string | null;
  status?: string | null;
}

export interface QueueBulkResource {
  ids?: number[] | null;
}

export interface QueueResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  authorId?: number | null;
  /** @format int32 */
  bookId?: number | null;
  author?: AuthorResource | null;
  book?: BookResource | null;
  quality?: QualityModel | null;
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
  trackedDownloadStatus?: TrackedDownloadStatus | null;
  trackedDownloadState?: TrackedDownloadState | null;
  statusMessages?: TrackedDownloadStatusMessage[] | null;
  errorMessage?: string | null;
  downloadId?: string | null;
  conversionStatus?: string | null;
  /** @format int32 */
  convertToQualityId?: number | null;
  convertToQuality?: string | null;
  /** @format double */
  conversionProgress?: number | null;
  conversionMessage?: string | null;
  canCancelConversion?: boolean;
  canRetryImport?: boolean;
  awaitingImportConfirmation?: boolean;
  protocol?: DownloadProtocol;
  downloadClient?: string | null;
  downloadClientHasPostImportCategory?: boolean;
  indexer?: string | null;
  outputPath?: string | null;
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
  /** @format double */
  popularity?: number;
}

export interface Rejection {
  reason?: string | null;
  type?: RejectionType;
  canBypass?: boolean;
  category?: string | null;
  /** @format int32 */
  severity?: number;
  isHardFilter?: boolean;
  isSoftFilter?: boolean;
  isLanguageFilter?: boolean;
  isQualityFilter?: boolean;
}

export interface RejectionDetail {
  reason?: string | null;
  type?: string | null;
  category?: string | null;
  canBypass?: boolean;
  /** @format int32 */
  severity?: number;
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
  isGrabbed?: boolean;
  /** @format date-time */
  expiresAt?: string | null;
  guid?: string | null;
  quality?: QualityModel | null;
  /** @format int32 */
  qualityWeight?: number;
  isMultiFormat?: boolean;
  allDetectedFormats?: string | null;
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
  displayTitle?: string | null;
  discography?: boolean;
  sceneSource?: boolean;
  airDate?: string | null;
  authorName?: string | null;
  bookTitle?: string | null;
  matchedTitle?: string | null;
  /** @format int32 */
  matchedTitleCharStart?: number | null;
  /** @format int32 */
  matchedTitleCharEnd?: number | null;
  approved?: boolean;
  temporarilyRejected?: boolean;
  rejected?: boolean;
  rejections?: string[] | null;
  rejectionDetails?: RejectionDetail[] | null;
  hasSoftFilters?: boolean;
  hasHardFilters?: boolean;
  canBypassFilters?: boolean;
  /** @format date-time */
  publishDate?: string;
  commentUrl?: string | null;
  downloadUrl?: string | null;
  infoUrl?: string | null;
  downloadAllowed?: boolean;
  /** @format int32 */
  releaseWeight?: number;
  /** @format int32 */
  rank?: number;
  customFormats?: CustomFormatResource[] | null;
  /** @format int32 */
  customFormatScore?: number;
  isPreferredChoice?: boolean;
  autoPickReasons?: string[] | null;
  magnetUrl?: string | null;
  infoHash?: string | null;
  /** @format int32 */
  seeders?: number | null;
  /** @format int32 */
  leechers?: number | null;
  protocol?: DownloadProtocol;
  /** @format int32 */
  indexerFlags?: number;
  duration?: string | null;
  narrator?: string | null;
  isGraphicAudio?: boolean;
  /** @format int32 */
  authorId?: number | null;
  /** @format int32 */
  bookId?: number | null;
  searchId?: string | null;
  /** @format int32 */
  searchedBookId?: number | null;
  /** @format int32 */
  downloadClientId?: number | null;
  downloadClient?: string | null;
  formatType?: string | null;
}

export interface ReleaseSearchResponse {
  /** @format int32 */
  indexersQueried?: number;
  /** @format int32 */
  indexersFailed?: number;
  releases?: ReleaseResource[] | null;
  hiddenReleases?: ReleaseResource[] | null;
  filterSummary?: FilterSummary | null;
  /** @format int32 */
  siblingBookId?: number | null;
  siblingMediaType?: string | null;
  siblingToggleEnabled?: boolean;
  siblingToggleDisabledReason?: string | null;
}

export interface RemotePathMappingResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  downloadClientId: number;
  host?: string | null;
  remotePath?: string | null;
  localPath?: string | null;
}

export interface RemotePathMappingSuggestionsResource {
  downloadClientPaths?: string[] | null;
  chaptarrPaths?: string[] | null;
  downloadClientError?: string | null;
}

export interface RemotePathMappingTestResource {
  /** @format int32 */
  downloadClientId?: number;
  host?: string | null;
  remotePath?: string | null;
  localPath?: string | null;
  mappedPath?: string | null;
  isMapped?: boolean;
  localPathExists?: boolean;
  localPathWritable?: boolean;
  mappedPathExists?: boolean;
  mappedPathWritable?: boolean;
  downloadClientPathChecked?: boolean;
  downloadClientPathMatched?: boolean;
  downloadClientMatchedPath?: string | null;
  downloadClientItemPathChecked?: boolean;
  downloadClientItemMappedPath?: string | null;
  downloadClientItemPathExists?: boolean;
  downloadClientItemPathWritable?: boolean;
  downloadClientTestError?: string | null;
}

export interface RenameBookResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  authorId?: number;
  /** @format int32 */
  bookId?: number;
  /** @format int32 */
  editionId?: number;
  /** @format int32 */
  bookFileId?: number;
  existingPath?: string | null;
  newPath?: string | null;
  canOrganize?: boolean;
  reason?: string | null;
}

export interface RetagBookResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  authorId?: number;
  /** @format int32 */
  bookId?: number;
  trackNumbers?: number[] | null;
  /** @format int32 */
  bookFileId?: number;
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
  /** @uniqueItems true */
  defaultTags?: number[] | null;
  isCalibreLibrary?: boolean;
  host?: string | null;
  /** @format int32 */
  port?: number;
  urlBase?: string | null;
  username?: string | null;
  password?: string | null;
  library?: string | null;
  outputFormat?: string | null;
  outputProfile?: string | null;
  useSsl?: boolean;
  /** @format int32 */
  folderType: number;
  placeEbooksWithAudiobooks?: boolean;
  defaultSyncMonitoredAcrossFormats?: boolean | null;
  isEffectiveDefaultAudiobook?: boolean;
  isEffectiveDefaultEbook?: boolean;
  audiobook?: MediaTypeSettingsResource | null;
  ebook?: MediaTypeSettingsResource | null;
  audiobookMonitored?: boolean | null;
  audiobookMonitorExistingMode?: MonitorTypes | null;
  audiobookMonitorExistingBooks?: boolean | null;
  /** @format int32 */
  audiobookMonitorExisting?: number | null;
  audiobookMonitorFuture?: boolean | null;
  audiobookMonitorNewItems?: NewItemMonitorTypes | null;
  ebookMonitored?: boolean | null;
  ebookMonitorExistingMode?: MonitorTypes | null;
  ebookMonitorExistingBooks?: boolean | null;
  /** @format int32 */
  ebookMonitorExisting?: number | null;
  ebookMonitorFuture?: boolean | null;
  ebookMonitorNewItems?: NewItemMonitorTypes | null;
  /** @format int32 */
  audiobookQualityProfileId?: number | null;
  /** @format int32 */
  audiobookMetadataProfileId?: number | null;
  /** @format int32 */
  ebookQualityProfileId?: number | null;
  /** @format int32 */
  ebookMetadataProfileId?: number | null;
  audiobookWriteAudioBookShelfMetadataJson?: boolean | null;
  audiobookWriteAudioBookShelfCover?: boolean | null;
  ebookWriteAudioBookShelfMetadataJson?: boolean | null;
  ebookWriteAudioBookShelfCover?: boolean | null;
  audiobookTags?: number[] | null;
  ebookTags?: number[] | null;
  accessible?: boolean;
  /** @format int64 */
  freeSpace?: number | null;
  /** @format int64 */
  totalSpace?: number | null;
}

export interface SampleContext {
  authorName?: string | null;
  bookTitle?: string | null;
  seriesTitle?: string | null;
  seriesPosition?: string | null;
  narratorName?: string | null;
  narratorNames?: string[] | null;
  audioProductionType?: string | null;
  publisher?: string | null;
  isGraphicAudio?: boolean;
  quality?: string | null;
  year?: string | null;
}

export interface SearchResource {
  /** @format int32 */
  id?: number;
  foreignId?: string | null;
  providerId?: string | null;
  /** @format int32 */
  existingLocalId?: number | null;
  /** @format int32 */
  metadataBookCount?: number | null;
  author?: AuthorResource | null;
  book?: BookResource | null;
  series?: SeriesResource | null;
}

export interface SelectOption {
  /** @format int32 */
  value?: number;
  name?: string | null;
  /** @format int32 */
  order?: number;
  hint?: string | null;
}

export interface SelectedSeriesBook {
  foreignBookId?: string | null;
  foreignAuthorId?: string | null;
  authorName?: string | null;
}

export interface SendMatchingLogsCommand {
  updateScheduledTask?: boolean;
  completionMessage?: string | null;
  diskAccessGroup?: string | null;
  isLongRunning?: boolean;
  supportsCancellation?: boolean;
  name?: string | null;
  /** @format date-time */
  lastExecutionTime?: string | null;
  /** @format date-time */
  lastStartTime?: string | null;
  trigger?: CommandTrigger;
  suppressMessages?: boolean;
  clientUserAgent?: string | null;
  sendUpdatesToClient?: boolean;
  requiresDiskAccess?: boolean;
  isExclusive?: boolean;
  isTypeExclusive?: boolean;
  progressMessage?: string | null;
  /** @format int32 */
  maxEntries?: number;
  failedMatchesOnly?: boolean;
  /** @format int32 */
  daysBack?: number;
  /** @format int32 */
  minutesBack?: number | null;
  specificFilePaths?: string[] | null;
  mediaType?: string | null;
  unmappedFiles?: UnmappedFilesSelection | null;
}

export interface SeriesBookLinkResource {
  /** @format int32 */
  id?: number;
  position?: string | null;
  /**
   * Presentation order derived from the original series position.
   * @format double
   */
  positionOrder?: number;
  /** @format int32 */
  seriesPosition?: number;
  /** @format int32 */
  seriesId?: number;
  /** @format int32 */
  bookId?: number;
}

export interface SeriesBookResource {
  foreignBookId?: string | null;
  foreignAuthorId?: string | null;
  title?: string | null;
  overview?: string | null;
  authorName?: string | null;
  /** @format date-time */
  releaseDate?: string | null;
  position?: string | null;
  images?: MediaCover[] | null;
  ratings?: Ratings | null;
}

export interface SeriesLookupResource {
  foreignSeriesId?: string | null;
  title?: string | null;
  titleSlug?: string | null;
  description?: string | null;
  /** @format int32 */
  workCount?: number;
  /** @format int32 */
  primaryWorkCount?: number;
  books?: SeriesBookResource[] | null;
}

export interface SeriesNarratorAnalysisResource {
  /** @format int32 */
  seriesId?: number;
  seriesTitle?: string | null;
  preferredNarrator?: string | null;
  narratorAnalysis?: NarratorAnalysisResource[] | null;
  sequentialOverlapNarrators?: string[] | null;
  /** @format int32 */
  booksWithoutNarratorCount?: number;
  /** @format int32 */
  totalBooksInSeries?: number;
}

export interface SeriesNarratorDiscoveryResource {
  /** @format int32 */
  seriesId?: number;
  completeNarrators?: NarratorDiscoveryInfoResource[] | null;
  partialNarrators?: NarratorDiscoveryInfoResource[] | null;
  existingVariants?: SeriesResource[] | null;
  recommendedNarrator?: NarratorDiscoveryInfoResource | null;
}

export interface SeriesNarratorInheritanceResource {
  /** @format int32 */
  seriesId?: number;
  seriesTitle?: string | null;
  preferredSeriesNarrator?: string | null;
  booksWithoutNarrator?: BookNarratorInheritanceInfo[] | null;
  canApplyInheritance?: boolean;
}

export interface SeriesNarratorPreferenceRequest {
  narrator?: string | null;
  applyToAllBooks?: boolean;
  overrideExisting?: boolean;
}

export interface SeriesNarratorPreferenceResponseResource {
  message?: string | null;
  appliedToBooks?: boolean;
}

export interface SeriesNarratorSearchResource {
  /** @format int32 */
  seriesId?: number;
  seriesTitle?: string | null;
  foundNarrators?: string[] | null;
  recommendedNarrator?: string | null;
  /** @format int32 */
  searchDurationMs?: number;
  success?: boolean;
  errorMessage?: string | null;
}

export interface SeriesResource {
  /** @format int32 */
  id?: number;
  foreignSeriesId?: string | null;
  localSeriesId?: string | null;
  title?: string | null;
  titleSlug?: string | null;
  description?: string | null;
  /** @format int32 */
  workCount?: number;
  /** @format int32 */
  primaryWorkCount?: number;
  mediaType?: string | null;
  narrator?: string | null;
  links?: SeriesBookLinkResource[] | null;
  images?: MediaCover[] | null;
  books?: SeriesBookResource[] | null;
}

export interface SetPrimaryPhotoRequest {
  photoUrl?: string | null;
  /** @format int32 */
  photoId?: number | null;
}

export interface SettingsBackupCreateRequest {
  rootFolder?: string | null;
  fileName?: string | null;
  passphrase?: string | null;
  /** @uniqueItems true */
  categories?: SettingsBackupCategory[] | null;
  overwriteExistingFile?: boolean;
}

export interface SettingsBackupFileInfo {
  path?: string | null;
  name?: string | null;
  /** @format int64 */
  size?: number;
  /** @format date-time */
  lastWriteTimeUtc?: string;
}

export interface SettingsBackupLocation {
  path?: string | null;
  exists?: boolean;
  writable?: boolean;
  warning?: string | null;
}

export interface SettingsBackupRestoreRequest {
  preview?: boolean;
  filePath?: string | null;
  passphrase?: string | null;
  /** @uniqueItems true */
  categories?: SettingsBackupCategory[] | null;
  mode?: SettingsBackupRestoreMode;
}

export interface SettingsBackupRestoreResult {
  wouldRemove?: string[] | null;
  applied?: string[] | null;
  warnings?: string[] | null;
}

export interface SettingsBackupResult {
  path?: string | null;
  counts?: Record<string, number> | null;
  warnings?: string[] | null;
}

export interface SystemResetResource {
  message?: string | null;
}

export interface SystemResource {
  appName?: string | null;
  instanceName?: string | null;
  installationId?: string | null;
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

export interface SystemRestartResource {
  restarting?: boolean;
}

export interface SystemShutdownResource {
  shuttingDown?: boolean;
}

export interface SystemStatisticsResource {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  totalBooks?: number;
  /** @format int32 */
  audiobookCount?: number;
  /** @format int32 */
  ebookCount?: number;
  /** @format int32 */
  monitoredBooks?: number;
  /** @format int32 */
  audiobooksMonitored?: number;
  /** @format int32 */
  ebooksMonitored?: number;
  /** @format int32 */
  fileCount?: number;
  /** @format int64 */
  totalFileSize?: number;
  /** @format int32 */
  authorCount?: number;
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
  authorIds?: number[] | null;
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
  theme?: string | null;
  addNewDefaultMediaType?: string | null;
}

export interface UnmappedFilesSelection {
  scope?: string | null;
  bookFileIds?: number[] | null;
  exceptBookFileIds?: number[] | null;
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
  changes?: UpdateChanges | null;
  hash?: string | null;
}

export interface ValidateRequest {
  pattern?: string | null;
  ast?: PatternAst | null;
}
