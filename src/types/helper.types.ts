// The default utility type is not typed in the keys
type OmitTyped<Obj extends object, Keys extends keyof Obj> = Omit<Obj, Keys>;

type OmitTyped2<T, K extends keyof T | (string & {}) | (number & {}) | (symbol | {})> = { [P in Exclude<keyof T, K>]: T[P] };
