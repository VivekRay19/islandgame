/* tslint:disable */
/* eslint-disable */

export class Engine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Apply a command. Returns {"ok":true,"events":[...]} or {"ok":false,"error":"..."}.
     */
    apply(command_json: string): string;
    /**
     * Legal sites for a tile kind ("tile_farm", ...).
     */
    build_map(kind: string): string;
    config(): string;
    /**
     * The Advisor's suggested next command.
     */
    hint(): string;
    /**
     * Everything played so far, for submitting to the server.
     */
    history(): string;
    /**
     * `config_json`: {"seed":123,"island":"forest","heat":0,"rounds":12,"unlocked":[...]|null}
     */
    constructor(config_json: string);
    preview_build(kind: string, q: number, r: number): string;
    /**
     * Full renderable state.
     */
    view(): string;
}

export function catalog(): string;

export function daily_seed_for(date: string): number;

export function island_for_seed(seed: number): string;

export function level_for_xp(xp: number): number;

export function rules_version(): string;

/**
 * Seed from a text code ("TABLE-7F2K") or a date for the daily island.
 */
export function seed_from_code(code: string): number;

export function unlocks(level: number): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_engine_free: (a: number, b: number) => void;
    readonly catalog: () => [number, number];
    readonly daily_seed_for: (a: number, b: number) => number;
    readonly engine_apply: (a: number, b: number, c: number) => [number, number];
    readonly engine_build_map: (a: number, b: number, c: number) => [number, number];
    readonly engine_config: (a: number) => [number, number];
    readonly engine_hint: (a: number) => [number, number];
    readonly engine_history: (a: number) => [number, number];
    readonly engine_new: (a: number, b: number) => [number, number, number];
    readonly engine_preview_build: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly engine_view: (a: number) => [number, number];
    readonly island_for_seed: (a: number) => [number, number];
    readonly level_for_xp: (a: number) => number;
    readonly rules_version: () => [number, number];
    readonly seed_from_code: (a: number, b: number) => number;
    readonly unlocks: (a: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
