import * as types from "./types";

export enum T {
    STRING  = "t_STRING",
    NUMBER = "t_NUMBER",
    LPARENS = "t_LPARENS",
    RPARENS = "t_RPARENS",
    SYMBOL = "t_SYMBOL",
    QUOTE = "t_QUOTE",
    WHITESPACE = "t_WHITESPACE",
    COMMENT = "t_COMMENT",
    EOF = "t_EOF"
}

interface Token {
    type: T,
    value?: string | number,
    name?: string,
    readonly lineno: number,
    readonly colno:  number
}

const tokenDefinitions = [
    { type: T.STRING, regex: /^"([^"]*)"/ },
    { type: T.NUMBER, regex: /^(((\d+(\.\d*)?)|(\.\d+))([eE]\d+)?)/ },
    { type: T.LPARENS, regex: /^(\()/ },
    { type: T.RPARENS, regex: /^(\))/ },
    { type: T.QUOTE, regex: /^(')/ },
    { type: T.SYMBOL, regex: /^([a-zA-Z_!?\\/+\-<>=*%][a-zA-Z_!?\\/+\-<>=*%\d]*)/ },
    { type: T.COMMENT, regex: /^;([^\n]*)/ }
];

export function* tokenize(text: string): IterableIterator<Token> {
    let lineno = 1;
    let colno = 1;
    while (text.length > 0) {
        let match;
        if (match = /^[\s\r\n]+/.exec(text)) {
            yield {
                type: T.WHITESPACE,
                lineno: lineno,
                colno: colno
            };
            let newlines;
            if (newlines = match[0].match(/\r?\n/g)) {
                lineno += newlines.length;
                colno = /[^\r\n]*$/.exec(match[0])[0].length + 1;
            } else {
                colno += match[0].length;
            }
            text = text.slice(match[0].length);
            continue;
        }
        for (let tok of tokenDefinitions) {
            if (match = tok.regex.exec(text)) {
                if (tok.type !== T.COMMENT) {
                    yield {
                        type: tok.type,
                        value: match[1],
                        colno: colno,
                        lineno: lineno
                    };
                }
                colno += match[0].length;
                text = text.slice(match[0].length);
                break;
            }
        }
        if (!match) {
            throw SyntaxError(`Unexpected syntax at ${lineno}:${colno}`);
        }
    }
    yield {type: T.EOF, value: null, lineno: lineno, colno: colno};
}

export class EggParser {
    tokens: Iterator<Token>;
    peek: Token;
    previous: Token;
    done: boolean;
    constructor(text: string) {
        this.tokens = tokenize(text);
        this.done = false;
        this.peek = {type: null, value: null, colno: 0, lineno: 0};
        this.previous = this.peek;
        this.next();
    }
    loc(token: Token): string {
        return `${token.type}[${token.value}] at ${token.lineno}:${token.colno}`;
    }
    next(): Token {
        if (this.done) {
            throw SyntaxError(`End of input reached unexpectedly after ${this.loc(this.previous)}`)
        }
        if (this.peek.type === T.EOF) {
            this.done = true;
            return this.peek;
        }
        this.previous = this.peek;
        this.peek = this.tokens.next().value;
        return this.previous;
    }
    takeAny(token_type: T): number {
        let eaten = 0;
        while (this.peek.type === token_type) {
            this.next();
            eaten++;
        }
        return eaten;
    }
    takeOne(token_type: T): Token {
        if (this.peek.type !== token_type) {
            throw SyntaxError(`Expected ${token_type} but got ${this.loc(this.peek)}`);
        }
        return this.next();
    }
    assertDone() {
        // If we are not done, try reading EOF
        // takeOne will throw if there are non-whitespace tokens left
        if (!this.done) {
            this.whitespace();
            this.takeOne(T.EOF);
        }
    }
    expr(): types.EggValue {
        this.whitespace();
        switch(this.peek.type) {
            case T.QUOTE:
                return this.qval();
            case T.NUMBER:
                return this.number();
            case T.STRING:
                return  this.string();
            case T.SYMBOL:
                return this.symbol();
            case T.LPARENS:
                return this.list();
            default:
                throw SyntaxError(`Unexpected token ${this.loc(this.peek)}`)
        }
    }
    whitespace(optional: boolean=true) {
        const n = this.takeAny(T.WHITESPACE);
        if (!optional && n === 0) {
            throw SyntaxError(`Expected whitespace, got ${this.loc(this.peek)}`)
        }
    }
    qval(): types.EggValue {
        this.takeOne(T.QUOTE);
        return types.qval(this.expr());
    }
    number(): types.EggValue {
        let num = this.takeOne(T.NUMBER);
        return types.number(num.value);
    }
    string(): types.EggValue {
        let str = this.takeOne(T.STRING);
        return types.string(str.value);
    }
    symbol(): types.EggValue {
        let sym = this.takeOne(T.SYMBOL);
        return types.symbol(sym.value);
    }
    list(): types.EggValue {
        this.takeOne(T.LPARENS);
        this.whitespace();
        // Empty list
        if (this.peek.type === T.RPARENS) {
            this.next();
            return types.NIL;
        }
        // Non-empty list:  create 1-element list, then add elements at the end
        // until we hit a closing parens
        const head = types.list(this.expr(), types.NIL);
        let tail = head;
        // @ts-ignore
        while (this.peek.type !== T.RPARENS) {
            this.whitespace(false);
            tail.tail = types.list(this.expr(), types.NIL);
            tail = tail.tail;
        }
        this.takeOne(T.RPARENS);
        return head;
    }
}