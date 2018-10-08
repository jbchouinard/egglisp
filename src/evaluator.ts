import { RuntimeError } from "./errors";
import { EggValue, Type, typeOf, typeAssert, NIL, FALSE } from "./types";
import { EggParser, T } from "./parser";
import Env from "./env";

function repr_env(env: Env): string {
    const parts = [];
    for(let entry of env.bindings.entries()) {
        const [name, value] = entry;
        parts.push(`${name}=${repr(value)}`);
    }
    return `{${parts.join(', ')}}`
}

export function repr(value: EggValue | Env): string {
    if (value instanceof Env) {
        return repr_env(value);
    }
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
        case Type.BUILTIN:
            return `<builtin function "${value.name}">`;
        case Type.SPECIALFORM:
            return `<builtin macro "${value.name}">`;
        case Type.FUNCTION:
            return `<function on (${value.params.join(' ')})>`;
        case Type.LIST:
            const parts = [];
            while (value.tail !== null) {
                parts.push(repr(value.head));
                value = value.tail;
            }
            return `(${parts.join(' ')})`;
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
        default:
            return value;
    }
}

export function eggExec(code: string, env: Env) {
    const parser = new EggParser();
    parser.readString(code);
    while (!parser.done()) {
        eggEval(parser.expr(), env);
        if (!parser.done()) {
            parser.expect(T.WS)
        }
    }
}

export function getArgs(list: EggValue, n: number): Array<EggValue> {
    typeAssert(list, Type.LIST);
    const values = [];
    for(let i = 0; i < n; i++) {
        if (list === NIL) {
            throw new RuntimeError(`Too few arguments, expected ${n}`);
        }
        values.push(list.head);
        list = list.tail;
    }
    if (list !== NIL) {
        throw new RuntimeError(`Too many arguments, expected ${n}`);
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

function applyBuiltin(builtin: EggValue, args: EggValue, env: Env) {
    return builtin.func(evalArgs(args, env), env);
}

function applySpecialForm(special: EggValue, args: EggValue, env: Env) {
    return special.func(args, env);
}

function applyFunction(func: EggValue, args: EggValue, env: Env) {
    let argsArr = getArgs(args, func.params.length);
    argsArr = argsArr.map(a => eggEval(a, env));
    const locals = new Env(func.closure);
    for (let i = 0; i < func.params.length; i++) {
        locals.set(func.params[i], argsArr[i]);
    }
    return eggEval(func.body, locals);
}

export function apply(callable: EggValue, args: EggValue, env: Env) {
    switch (callable.type) {
        case Type.BUILTIN:
            return applyBuiltin(callable, args, env);
        case Type.SPECIALFORM:
            return applySpecialForm(callable, args, env);
        case Type.FUNCTION:
            return applyFunction(callable, args, env);
        default:
            throw new RuntimeError(`Value of type ${callable.type} cannot be applied`);
    }
}
