import Env from "./env";

export enum Type {
    BOOLEAN = "boolean",
    NUMBER = "number",
    SYMBOL = "symbol",
    STRING = "string",
    LIST = "list",
    QVAL = "quoted-value",
    BFUNCTION = "builtin-function",
    BMACRO = "builtin-macro",
    FUNCTION = "function",
    MACRO = "macro",
    ENVIRONMENT = "environment"
}

export interface FBuiltin {
    (EggValue, Env): EggValue
}

export interface EggValue {
    readonly type: Type,
    // Functions and macros
    readonly func?: FBuiltin,
    readonly params?: EggValue,
    readonly body?: EggValue,
    readonly closure?: EggValue, // points to a Closure obj.
    // Symbols
    readonly name?: string,
    // Numbers and booleans
    readonly numValue?: number,
    // Strings
    readonly strValue?: string,
    // Quoted values
    readonly value?: EggValue,
    // Closures
    readonly env?: Env,
    // Lists
    head?: EggValue,
    tail?: EggValue
}

export function typeOf(value: EggValue): Type {
    return value.type;
}

export function typeAssert(value: EggValue, ...types: Array<Type>) {
    for (let type of types) {
        if (typeOf(value) === type) {
            return;
        }
    }
    throw new TypeError(`Expected value of type ${types}, got ${value.type}`)
}

export function specialform(func, name): EggValue {
    return {
        type: Type.BMACRO,
        func: func,
        name: name
    }
}
export function bool(value: number | boolean): EggValue {
    if (value === 0 || value === false) {
        return FALSE;
    }
    return TRUE;
}
export function builtin(func, name): EggValue {
    return {
        type: Type.BFUNCTION,
        func: func,
        name: name
    }
}
export function func(body, params, closure): EggValue {
    return {
        type: Type.FUNCTION,
        body: body,
        closure: closure,
        params: params
    }
}
export function macro(body, params, closure): EggValue {
    return {
        type: Type.MACRO,
        body: body,
        closure: closure,
        params: params
    }
}
export function number(val): EggValue {
    return {
        type: Type.NUMBER,
        numValue: +val
    }
}
export function string(val): EggValue {
    return {
        type: Type.STRING,
        strValue: `${val}`
    }
}
export function symbol(name): EggValue {
    return {
        type: Type.SYMBOL,
        name: name
    }
}
export function list(head, tail): EggValue {
    // On top of type safety, this ensures NIL is unique,
    // since tail=null would fail this check
    typeAssert(tail, Type.LIST);
    return {
        type: Type.LIST,
        head: head,
        tail: tail
    }
}
export function qval(value: EggValue): EggValue {
    return {
        type: Type.QVAL,
        value: value
    }
}
export function environment(env: Env): EggValue {
    return {
        type: Type.ENVIRONMENT,
        env: env
    }
}

export const NIL: EggValue = {type: Type.LIST, head: null, tail: null};
export const TRUE: EggValue = {type: Type.BOOLEAN, numValue: 1};
export const FALSE: EggValue = {type: Type.BOOLEAN, numValue: 0};
export const INF: EggValue = number(Infinity);
export const NAN: EggValue = number(NaN);


