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
    { type: T.STRING, regex: /^"([^"]*")/ },
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
    yield {type: T.EOF, lineno: lineno, colno: colno};
}


export class EggParser {
    tokens: Iterator<Token>;
    peek: Token;
    readString(text: string) {
        this.readTokens(tokenize(text));
    }
    readTokens(tokens: Iterator<Token>) {
        this.tokens = tokens;
        this.peek = {type: null, colno: 0, lineno: 0};
        this.next(); // Read in first token
    }
    next(): Token {
        if (this.peek.type === T.EOF) {
            throw SyntaxError("End of input reached")
        }
        const peek = this.peek;
        this.peek = this.tokens.next().value;
        return peek;
    }
    loc(): string {
        return `${this.peek.lineno}:${this.peek.colno}`
    }
    expect(token_type: T): Token {
        if (this.peek.type !== token_type) {
            throw SyntaxError(`Expected ${token_type} at ${this.loc()} but got ${this.peek.type}`);
        }
        return this.next();
    }
    eat(token_type: T): boolean {
        if (this.peek.type === token_type) {
            this.next();
            return true;
        }
        return false;
    }
    done(): boolean {
        return this.peek.type === T.EOF;
    }
    assert_done() {
        this.whitespace();
        if (!this.done()) {
            throw(SyntaxError(`Expected end of input at ${this.loc()}`));
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
            case T.EOF:
                throw SyntaxError("Unexpected end of input");
            default:
                throw SyntaxError(`Unexpected token ${this.peek.type} at ${this.loc()}`)
        }
    }
    whitespace(): void {
        while (this.eat(T.WHITESPACE)) {}
    }
    qval(): types.EggValue {
        this.expect(T.QUOTE);
        return types.qval(this.expr());
    }
    number(): types.EggValue {
        let num = this.expect(T.NUMBER);
        return types.number(num.value);
    }
    string(): types.EggValue {
        let str = this.expect(T.STRING);
        return types.string(str.value);
    }
    symbol(): types.EggValue {
        let sym = this.expect(T.SYMBOL);
        return types.symbol(sym.value);
    }
    list(): types.EggValue {
        this.expect(T.LPARENS);
        this.whitespace();

        // Empty list
        if (this.eat(T.RPARENS)) { return types.NIL; }

        // Non-empty list:  create 1-element list, then add elements at the end
        // until we hit a closing parens
        const head = types.list(this.expr(), types.NIL);
        let tail = head;
        while (!this.eat(T.RPARENS)) {
            this.expect(T.WHITESPACE);
            this.whitespace();
            tail.tail = types.list(this.expr(), types.NIL);
            tail = tail.tail;
        }
        return head;
    }
}

