import Env from "./env";

export enum Type {
    BOOLEAN = "boolean",
    NUMBER = "number",
    SYMBOL = "symbol",
    STRING = "string",
    LIST = "list",
    BUILTIN = "builtin",
    FUNCTION = "function",
    SPECIALFORM = "specialform",
    MACRO = "macro"
}

export interface FBuiltin {
    (EggValue, Env): EggValue
}

export interface EggValue {
    readonly type: Type,
    readonly func?: FBuiltin,
    readonly body?: EggValue,
    readonly name?: string,
    readonly numValue?: number,
    readonly strValue?: string,
    readonly closure?: Env,
    readonly params?: Array<string>,
    head?: EggValue,
    tail?: EggValue

}

export const NIL: EggValue = {type: Type.LIST, head: null, tail: null};
export const TRUE: EggValue = {type: Type.BOOLEAN, numValue: 1};
export const FALSE: EggValue = {type: Type.BOOLEAN, numValue: 0};

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
        type: Type.SPECIALFORM,
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
        type: Type.BUILTIN,
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

