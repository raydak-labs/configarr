export type CustomFormatSpecification = {
  id?: number;
  name?: string | null;
  implementation?: string | null;
  implementationName?: string | null;
  infoLink?: string | null;
  negate?: boolean;
  required?: boolean;
  fields?: Array<{
    name?: string | null;
    value?: unknown;
    order?: number;
    label?: string | null;
    unit?: string | null;
    helpText?: string | null;
    type?: string | null;
    advanced?: boolean;
    isFloat?: boolean;
  }> | null;
};

/** TRaSH/config mapping payload sent to *arr custom-format APIs. */
export type CustomFormatRequest = {
  id?: number;
  name?: string | null;
  includeCustomFormatWhenRenaming?: boolean | null;
  specifications?: CustomFormatSpecification[] | null;
};
