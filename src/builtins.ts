import Env from "./env";
import { ArgumentError } from "./errors";
import { toString, repr, eggEval, getArgs, getVarArgs } from "./evaluator";
import {
    NIL, TRUE, FALSE, NAN, INF, EggValue, Type, FBuiltin, typeAssert, typeOf,
    bool, string, number, builtin, specialform, func, macro, list, environment
} from "./types";


// Builtin Functions
function fAdd(args: EggValue): EggValue {
    let acc = 0;
    while (args !== NIL) {
        typeAssert(args.head, Type.NUMBER, Type.BOOLEAN);
        acc += args.head.numValue;
        args = args.tail;
    }
    return number(acc);
}
function fConcat(args: EggValue): EggValue {
    let parts = [];
    while (args !== NIL) {
        typeAssert(args.head, Type.STRING);
        parts.push(args.head.strValue);
        args = args.tail;
    }
    return string(String.prototype.concat(...parts));
}
function fIsNil(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    return bool(arg === NIL);
}
function fList(args: EggValue): EggValue {
    return args;
}
function fHead(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    typeAssert(arg, Type.LIST);
    if (arg === NIL) {
        throw new ArgumentError('Cannot take head of empty list (nil)');
    }
    return arg.head;
}
function fTail(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    typeAssert(arg, Type.LIST);
    if (arg === NIL) {
        throw new ArgumentError('Cannot take tail of empty list (nil)');
    }
    return arg.tail;
}
function fCons(args: EggValue): EggValue {
    const [value, rest] = getArgs(args, 2);
    typeAssert(rest, Type.LIST);
    return list(value, rest);
}
function fBody(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    typeAssert(arg, Type.FUNCTION, Type.MACRO);
    return arg.body;
}
function fClosure(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    typeAssert(arg, Type.FUNCTION, Type.MACRO);
    return arg.closure;
}
function fEval(args: EggValue, env: Env): EggValue {
    return eggEval(getArgs(args, 1)[0], env);
}
function fPrint(args: EggValue): EggValue {
    const argsArr = getVarArgs(args);
    console.log(...argsArr.map(toString));
    return NIL;
}
function fInspect(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    console.dir(arg, {depth: 5});
    return NIL;
}
function fIs(args: EggValue): EggValue {
    const [left, right] = getArgs(args, 2);
    return bool(left === right);
}
function fTypeOf(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    return string(typeOf(arg));
}
function fGlobals(args: EggValue, env: Env): EggValue {
    getArgs(args, 0);
    return environment(env);
}
function fRepr(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    return string(repr(arg));
}
function fToString(args: EggValue): EggValue {
    const arg = getArgs(args, 1)[0];
    return string(toString(arg));
}


// Builtin Macros: receive their arguments unevaluated
function mDef(args: EggValue, env: Env): EggValue {
    const [symbol, value] = getArgs(args, 2);
    typeAssert(symbol, Type.SYMBOL);
    env.def(symbol.name, eggEval(value, env));
    return NIL;
}
function mSet(args: EggValue, env: Env): EggValue {
    const [symbol, value] = getArgs(args, 2);
    typeAssert(symbol, Type.SYMBOL);
    env.set(symbol.name, eggEval(value, env));
    return NIL;
}
function mSetNonLocal(args: EggValue, env: Env): EggValue {
    const [symbol, value] = getArgs(args, 2);
    typeAssert(symbol, Type.SYMBOL);
    env.setNonLocal(symbol.name, eggEval(value, env));
    return NIL;
}
function mFunc(args: EggValue, env: Env): EggValue {
    let [symbols, body] = getArgs(args, 2);
    const symArray = [];
    while (symbols !== NIL) {
        typeAssert(symbols.head, Type.SYMBOL);
        symArray.push(symbols.head.name);
        symbols = symbols.tail;
    }
    return func(body, symArray, environment(env))
}
function mMacro(args: EggValue, env: Env): EggValue {
    let [symbols, body] = getArgs(args, 2);
    const symArray = [];
    while (symbols !== NIL) {
        typeAssert(symbols.head, Type.SYMBOL);
        symArray.push(symbols.head.name);
        symbols = symbols.tail;
    }
    return macro(body, symArray, environment(env));
}
function mQuote(args: EggValue): EggValue {
    return getArgs(args, 1)[0];
}
function mIf(args: EggValue, env: Env): EggValue {
    let [cond, iftrue, iffalse] = getArgs(args, 3);
    cond = eggEval(cond, env);
    if (cond === TRUE) {
        return eggEval(iftrue, env);
    } else if (cond === FALSE) {
        return eggEval(iffalse, env);
    }
    throw new ArgumentError("First argument must be boolean");
}


function addFunc(env:Env, name: string, func: FBuiltin) {
    env.def(name, builtin(func, name));
}

function addMacro(env: Env, name: string, func: FBuiltin) {
    env.def(name, specialform(func, name));
}

export function addBuiltins(env: Env) {
    // Language basics
    env.def("nil", NIL);
    env.def("true", TRUE);
    env.def("false", FALSE);
    env.def("nan", NAN);
    env.def("inf", INF);
    addMacro(env, "def", mDef);
    addMacro(env, "set!", mSet);
    addMacro(env, "set*", mSetNonLocal);
    addMacro(env, "fn", mFunc);
    addMacro(env, "macro", mMacro);
    addMacro(env, "if", mIf);
    addFunc(env, "is?", fIs);
    addFunc(env, "inspect", fInspect);
    addFunc(env, "globals", fGlobals);
    addFunc(env, "type-of", fTypeOf);
    addFunc(env, "print", fPrint);
    addFunc(env, "str", fToString);
    addFunc(env, "repr", fRepr);

    // List functions
    addFunc(env, "cons", fCons);
    addFunc(env, "list", fList);
    addFunc(env, "head", fHead);
    addFunc(env, "tail", fTail);
    addFunc(env, "nil?", fIsNil);

    // Arithmetic functions
    addFunc(env, "+", fAdd);

    // String functions
    addFunc(env, "concat", fConcat);

    // Meta-programming
    addMacro(env, "quote", mQuote);
    addFunc(env, "eval", fEval);
    addFunc(env, "body", fBody);
    addFunc(env, "closure", fClosure);
}

