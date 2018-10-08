import { ArgumentError, RuntimeError } from "./errors";
import { EggValue, Type, typeOf, typeAssert, NIL, FALSE } from "./types";
import Env from "./env";

function repr_env(env: Env): string {
    const parts = [];
    for(let entry of env.bindings.entries()) {
        const [name, value] = entry;
        parts.push(`${name}=${repr(value)}`);
    }
    return `{${parts.join(', ')}}`
}

export function repr(value: EggValue): string {
    switch (typeOf(value)) {
        case Type.NUMBER:
            return `${value.numValue}`;
        case Type.BOOLEAN:
            if (value === FALSE) {
                return "false";
            } else {
                return "true";
            }
        case Type.STRING:
            return `"${value.strValue}"`;
        case Type.SYMBOL:
            return `${value.name}`;
        case Type.BFUNCTION:
        case Type.BMACRO:
            return `<${typeOf(value)} "${value.name}">`;
        case Type.FUNCTION:
        case Type.MACRO:
            return `<${typeOf(value)} (${value.params.join(' ')}) -> ${repr(value.body)}>`;
        case Type.LIST:
            const parts = [];
            while (value.tail !== null) {
                parts.push(repr(value.head));
                value = value.tail;
            }
            return `(${parts.join(' ')})`;
        case Type.QVAL:
            return `'${repr(value.value)}`;
        case Type.CLOSURE:
            return `<${typeOf(value)} ${repr_env(value.env)}>`;
        default:
            return `<${typeOf(value)}>`;
    }
}

// @ts-ignore
export function eggEval(value: EggValue, env: Env): EggValue {
    if (value === NIL) {
        return NIL;
    }
    switch (typeOf(value)) {
        case Type.SYMBOL:
            return env.get(value.name);
        case Type.LIST:
            return apply(eggEval(value.head, env), value.tail, env);
        case Type.QVAL:
            return value.value;
        default:
            return value;
    }
}

export function getArgs(list: EggValue, n: number): Array<EggValue> {
    typeAssert(list, Type.LIST);
    const values = [];
    for(let i = 0; i < n; i++) {
        if (list === NIL) {
            throw new ArgumentError(`Too few arguments, expected ${n}`);
        }
        values.push(list.head);
        list = list.tail;
    }
    if (list !== NIL) {
        throw new ArgumentError(`Too many arguments, expected ${n}`);
    }
    return values;
}

export function getVarArgs(list: EggValue): Array<EggValue> {
    typeAssert(list, Type.LIST);
    const values = [];
    while (list !== NIL) {
        values.push(list.head);
        list = list.tail;
    }
    return values;
}

// Create a new LIST of same length as args, but containing
// the evaluated values
function evalArgs(args: EggValue, env: Env) {
    if (args === NIL) { return NIL; }
    const head: EggValue = {
        type: Type.LIST,
        head: eggEval(args.head, env),
        tail: null
    };
    let current = head;
    args = args.tail;
    while (args !== NIL) {
        current.tail = {
            type: Type.LIST,
            head: eggEval(args.head, env),
            tail: null
        };
        current = current.tail;
        args = args.tail;
    }
    current.tail = NIL;
    return head;
}

function applyBFunction(bfunc: EggValue, args: EggValue, env: Env) {
    return bfunc.func(evalArgs(args, env), env);
}

function applyBMacro(bmacro: EggValue, args: EggValue, env: Env) {
    return bmacro.func(args, env);
}

function applyFunction(func: EggValue, args: EggValue, env: Env) {
    let argsArr = getArgs(args, func.params.length);
    argsArr = argsArr.map(a => eggEval(a, env));
    const locals = new Env(func.closure.env);
    for (let i = 0; i < func.params.length; i++) {
        locals.set(func.params[i], argsArr[i]);
    }
    return eggEval(func.body, locals);
}

// Instead of sending evaluated arguments, macros get them
// unevaluated, then the *return value* of the macro is evaluated,
// They are meant to manipulate code
function applyMacro(macro: EggValue, args: EggValue, env: Env) {
    let argsArr = getArgs(args, macro.params.length);
    const locals = new Env(macro.closure.env);
    for (let i = 0; i < macro.params.length; i++) {
        locals.set(macro.params[i], argsArr[i]);
    }
    let result = eggEval(macro.body, locals);
    result = eggEval(result, env);
    return result;
}

export function apply(callable: EggValue, args: EggValue, env: Env) {
    switch (callable.type) {
        case Type.BFUNCTION:
            return applyBFunction(callable, args, env);
        case Type.BMACRO:
            return applyBMacro(callable, args, env);
        case Type.FUNCTION:
            return applyFunction(callable, args, env);
        case Type.MACRO:
            return applyMacro(callable, args, env);
        default:
            throw new RuntimeError(`Value of type ${callable.type} cannot be applied`);
    }
}
