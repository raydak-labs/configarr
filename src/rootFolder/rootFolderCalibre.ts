import type { InputConfigRootFolderChaptarr, InputConfigRootFolderReadarr } from "../types/config.types";

/** Calibre fields both book apps declare on their generated root folder resource. */
export type CalibreRootFolderFields = {
  isCalibreLibrary?: boolean;
  host?: string | null;
  port?: number;
  urlBase?: string | null;
  username?: string | null;
  password?: string | null;
  library?: string | null;
  outputFormat?: string | null;
  outputProfile?: string | null;
  useSsl?: boolean;
};

type CalibreConfig = Pick<
  InputConfigRootFolderReadarr | InputConfigRootFolderChaptarr,
  | "is_calibre_library"
  | "calibre_host"
  | "calibre_port"
  | "calibre_url_base"
  | "calibre_username"
  | "calibre_password"
  | "calibre_library"
  | "calibre_output_format"
  | "calibre_output_profile"
  | "calibre_use_ssl"
>;

/** Empty unless the config declares `is_calibre_library`, so the resource keeps the server's Calibre settings otherwise. */
export function calibreFieldsFromConfig(config: CalibreConfig): CalibreRootFolderFields {
  if (config.is_calibre_library === undefined) return {};

  return {
    isCalibreLibrary: config.is_calibre_library,
    host: config.calibre_host,
    port: config.calibre_port,
    urlBase: config.calibre_url_base,
    username: config.calibre_username,
    password: config.calibre_password,
    library: config.calibre_library,
    outputFormat: config.calibre_output_format,
    outputProfile: config.calibre_output_profile,
    useSsl: config.calibre_use_ssl,
  };
}

/** The password is left out: the API returns a masked value, never the stored one. */
export function calibreComparableFields(resource: CalibreRootFolderFields): Record<string, unknown> {
  return {
    isCalibreLibrary: resource.isCalibreLibrary,
    host: resource.host,
    port: resource.port,
    urlBase: resource.urlBase,
    username: resource.username,
    library: resource.library,
    outputFormat: resource.outputFormat,
    outputProfile: resource.outputProfile,
    useSsl: resource.useSsl,
  };
}
