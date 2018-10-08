import * as types from "./types";

export enum T {
    STR  = "t_STRING",
    NUM = "t_NUMBER",
    LPAR = "t_LPARENS",
    RPAR = "t_RPARENS",
    SYM = "t_SYMBOL",
    WS = "t_WHITESPACE",
    EOF = "t_EOF"
}

interface Token {
    type: T,
    value?: string | number,
    name?: string,
    readonly lineno: number,
    readonly colno:  number
}

export function* tokenize(text: string): IterableIterator<Token> {
    let match;
    let lineno = 1;
    let colno = 1;
    while (text.length > 0) {
        if (match = /^[\s\r\n]+/.exec(text)) {
            yield {type: T.WS, lineno: lineno, colno: colno};
            let newlines;
            if (newlines = /\r?\n/g.exec(match[0])) {
                lineno += newlines.length;
                colno = /[^\r\n]*$/.exec(match[0])[0].length + 1;
            } else {
                colno += match[0].length;
            }
        } else {
            if (match = /^"([^"]*)"/.exec(text)) {
                yield {type: T.STR, value: match[1], lineno: lineno, colno: colno};
            } else if (match = /^(((\d+(\.\d*)?)|(\.\d+))([eE]\d+)?)/.exec(text)) {
                yield {type: T.NUM, value: match[1], lineno: lineno, colno: colno};
            } else if (match = /^\(/.exec(text)) {
                yield {type: T.LPAR, lineno: lineno, colno: colno}
            } else if (match = /^\)/.exec(text)) {
                yield {type: T.RPAR, lineno: lineno, colno: colno}
            } else if (match = /^(([a-zA-Z_][a-zA-Z_!?\-\d]*)|([+\-\\/<>=*]+))/.exec(text)) {
                yield {type: T.SYM, name: match[1], lineno: lineno, colno: colno}
            } else {
                throw SyntaxError(`Unexpected syntax at ${lineno}:${colno}`);
            }
            colno += match[0].length;
        }
        text = text.slice(match[0].length)
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
        this.eat(T.WS);
        if (!this.done()) {
            throw(SyntaxError(`Expected end of input at ${this.loc()}`));
        }
    }
    expr(): types.EggValue {
        this.eat(T.WS);
        let expression;
        switch(this.peek.type) {
            case T.EOF:
                throw SyntaxError("Unexpected end of input");
            case T.NUM:
                expression = this.number();
                break;
            case T.STR:
                expression = this.string();
                break;
            case T.SYM:
                expression = this.symbol();
                break;
            case T.LPAR:
                expression = this.list();
                break;
            default:
                throw SyntaxError(`Unexpected token ${this.peek.type} at ${this.loc}`)
        }
        return expression;
    }
    number(): types.EggValue {
        let num = this.expect(T.NUM);
        return types.number(num.value);
    }
    string(): types.EggValue {
        let str = this.expect(T.STR);
        return types.string(str.value);
    }
    symbol(): types.EggValue {
        let sym = this.expect(T.SYM);
        return types.symbol(sym.name);
    }
    list(): types.EggValue {
        this.expect(T.LPAR);
        this.eat(T.WS);
        if (this.eat(T.RPAR)) { return types.NIL; }
        // Otherwise consume expressions until we find our matching rparens
        let tail = types.list(this.expr(), types.NIL);
        const head = tail;
        // Append other exprs
        while (!this.eat(T.RPAR)) {
            this.expect(T.WS);
            tail.tail = types.list(this.expr(), types.NIL);
            tail = tail.tail;
        }
        return head;
    }
}

