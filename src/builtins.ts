import Env from "./env";
import { RuntimeError } from "./errors";
import { eggEval, getArgs } from "./evaluator";
import {
    NIL, TRUE, FALSE, EggValue, Type, typeAssert,
    bool, string, number, builtin, specialform, func, list
} from "./types";


// Built-ins
function add(args: EggValue): EggValue {
    let acc = 0;
    while (args !== NIL) {
        typeAssert(args.head, Type.NUMBER, Type.BOOLEAN);
        acc += args.head.numValue;
        args = args.tail;
    }
    return number(acc);
}

function concat(args: EggValue): EggValue {
    let parts = [];
    while (args !== NIL) {
        typeAssert(args.head, Type.STRING);
        parts.push(args.head.strValue);
        args = args.tail;
    }
    return string(String.prototype.concat(...parts));
}

function isNil(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    return bool(arg === NIL);
}

function flist(args: EggValue): EggValue {
    return args;
}

function head(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    typeAssert(args, Type.LIST);
    if (arg === NIL) {
        throw new RuntimeError('Cannot take head of empty list (nil)');
    }
    return arg.head;
}

function tail(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    typeAssert(arg, Type.LIST);
    if (arg === NIL) {
        throw new RuntimeError('Cannot take tail of empty list (nil)');
    }
    return arg.tail;
}

function cons(args: EggValue): EggValue {
    const [value, rest] = getArgs(args, 2);
    typeAssert(rest, Type.LIST);
    return list(value, rest);
}

function def(args: EggValue, env: Env): EggValue {
    const [symbol, value] = getArgs(args, 2);
    typeAssert(symbol, Type.SYMBOL);
    env.set(symbol.name, eggEval(value, env));
    return NIL;
}

function body(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    typeAssert(arg, Type.FUNCTION);
    return arg.body;
}

// function closure(args: EggValue): Env {
//     const arg = getArgs(args, 1)[0];
//     typeAssert(arg, Type.FUNCTION);
//     return arg.closure;
// }


// Special Forms: receive their arguments unevaluated
function f(args: EggValue, env: Env): EggValue {
    let [symbols, body] = getArgs(args, 2);
    const symArray = [];
    while (symbols !== NIL) {
        typeAssert(symbols.head, Type.SYMBOL);
        symArray.push(symbols.head.name);
        symbols = symbols.tail;
    }
    return func(body, symArray, env)
}

function quote(args: EggValue): EggValue {
    return getArgs(args, 1)[0];
}

function feval(args: EggValue, env: Env): EggValue {
    return eggEval(getArgs(args, 1)[0], env);
}


export function addBuiltins(env: Env) {
    // Language basics
    env.set("nil", NIL);
    env.set("true", TRUE);
    env.set("false", FALSE);
    env.set("def", specialform(def));
    env.set("f", specialform(f));

    // List functions
    env.set("cons", builtin(cons));
    env.set("list", builtin(flist));
    env.set("head", builtin(head));
    env.set("tail", builtin(tail));
    env.set("nil?", builtin(isNil));

    // Arithmetic functions
    env.set("+", builtin(add));

    // String functions
    env.set("concat", builtin(concat));

    // Meta-programming
    env.set("quote", specialform(quote));
    env.set("eval", builtin(feval));
    env.set("body", builtin(body));
    // env.set("closure", builtin(closure));
}

