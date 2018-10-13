import { ArgumentError, RuntimeError } from "./errors";
import { EggValue, Type, typeOf, typeAssert, NIL, TRUE } from "./types";
import Env from "./env";

function repr_env(env: Env): string {
    const parts = [];
    for(let entry of env.bindings.entries()) {
        const [name, value] = entry;
        if (typeOf(value) === Type.ENVIRONMENT) {
            parts.push(`${name}=<environment {...}>`)
        } else {
            parts.push(`${name}=${repr(value)}`);
        }
    }
    return `{\n    ${parts.join(',\n    ')}\n}`
}

export function toString(value: EggValue): string {
    switch (typeOf(value)) {
        case Type.STRING:
            return value.strValue;
        default:
            return repr(value);
    }
}

export function repr(value: EggValue): string {
    switch (typeOf(value)) {
        case Type.NUMBER:
            return `${value.numValue}`;
        case Type.BOOLEAN:
            return value === TRUE ? "#t" : "#f";
        case Type.STRING:
            return `"${value.strValue}"`;
        case Type.SYMBOL:
            return `${value.name}`;
        case Type.BFUNCTION:
        case Type.BMACRO:
            return `<${typeOf(value)} "${value.name}">`;
        case Type.FUNCTION:
        case Type.MACRO:
            return `<${typeOf(value)} ${repr(value.params)}->${repr(value.body)}>`;
        case Type.LIST:
            const parts = [];
            while (value.tail !== null) {
                parts.push(repr(value.head));
                value = value.tail;
            }
            return `(${parts.join(' ')})`;
        case Type.QVAL:
            return `'${repr(value.value)}`;
        case Type.ENVIRONMENT:
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
    const locals = new Env(func.closure.env);
    let symbols = func.params;
    while (args !== NIL) {
       if (symbols === NIL) {
           throw new RuntimeError("Too many arguments")
       }
       locals.def(symbols.head.name, eggEval(args.head, env));
       args = args.tail;
       symbols = symbols.tail;
    }
    if (symbols !== NIL) { throw new RuntimeError("Too few arguments")}
    return eggEval(func.body, locals);
}

function applyMacro(macro: EggValue, args: EggValue, env: Env) {
    const locals = new Env(macro.closure.env);
    let symbols = macro.params;
    while (args !== NIL) {
        if (symbols === NIL) {
            throw new RuntimeError("Too many arguments")
        }
        locals.def(symbols.head.name, args.head);
        args = args.tail;
        symbols = symbols.tail;
    }
    if (symbols !== NIL) { throw new RuntimeError("Too few arguments")}
    const modifiedCode = (eggEval(macro.body, locals));
    return eggEval(modifiedCode, env);
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
