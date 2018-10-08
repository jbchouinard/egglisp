import * as types from "./types";

export enum T {
    STRING  = "t_STRING",
    NUMBER = "t_NUMBER",
    LPARENS = "t_LPARENS",
    RPARENS = "t_RPARENS",
    SYMBOL = "t_SYMBOL",
    QUOTE = "t_QUOTE",
    WHITESPACE = "t_WHITESPACE",
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
            yield {type: T.WHITESPACE, lineno: lineno, colno: colno};
            let newlines;
            if (newlines = /\r?\n/g.exec(match[0])) {
                lineno += newlines.length;
                colno = /[^\r\n]*$/.exec(match[0])[0].length + 1;
            } else {
                colno += match[0].length;
            }
        } else {
            if (match = /^"([^"]*)"/.exec(text)) {
                yield {type: T.STRING, value: match[1], lineno: lineno, colno: colno};
            } else if (match = /^(((\d+(\.\d*)?)|(\.\d+))([eE]\d+)?)/.exec(text)) {
                yield {type: T.NUMBER, value: match[1], lineno: lineno, colno: colno};
            } else if (match = /^\(/.exec(text)) {
                yield {type: T.LPARENS, lineno: lineno, colno: colno};
            } else if (match = /^\)/.exec(text)) {
                yield {type: T.RPARENS, lineno: lineno, colno: colno};
            } else if (match = /^'/.exec(text)) {
                yield {type: T.QUOTE, lineno: lineno, colno: colno};
            } else if (match = /^(([a-zA-Z_][a-zA-Z_!?\-\d]*)|([+\-\\/<>=*]+))/.exec(text)) {
                yield {type: T.SYMBOL, name: match[1], lineno: lineno, colno: colno}
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
        this.eat(T.WHITESPACE);
        if (!this.done()) {
            throw(SyntaxError(`Expected end of input at ${this.loc()}`));
        }
    }
    expr(): types.EggValue {
        this.eat(T.WHITESPACE);
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
                throw SyntaxError(`Unexpected token ${this.peek.type} at ${this.loc}`)
        }
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
        return types.symbol(sym.name);
    }
    list(): types.EggValue {
        this.expect(T.LPARENS);
        this.eat(T.WHITESPACE);

        // Empty list
        if (this.eat(T.RPARENS)) { return types.NIL; }

        // Non-empty list:  create 1-element list, then add elements at the end
        // until we hit a closing parens
        const head = types.list(this.expr(), types.NIL);
        let tail = head;
        while (!this.eat(T.RPARENS)) {
            this.expect(T.WHITESPACE);
            tail.tail = types.list(this.expr(), types.NIL);
            tail = tail.tail;
        }
        return head;
    }
}

