#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { ArgumentParser } from "argparse";

import Env from "./env";
import { addBuiltins } from "./builtins";
import { eggEval, repr } from "./evaluator";
import { EggParser, T } from "./parser";

const argparser = new ArgumentParser({description: "egglisp v0.1.0"});
argparser.addArgument(["-i", "--interactive"], {action: "storeTrue", help: "Start REPL"});
argparser.addArgument(["--stack"], {action: "storeTrue", help: "Print stack traces"});
argparser.addArgument("scripts", {nargs: '*'});
const args = argparser.parseArgs();

// Create global env
const env = new Env(null);
addBuiltins(env);

// Load Standard Lib
execFile(path.join(__dirname, '../lang/stdlib.egglisp'));

// Load CLI specified script(s)
args.scripts.forEach(execFile);

// Run REPL
if (args.interactive || args.scripts.length === 0) {
    repl();
}

function execFile(filename) {
    console.log(`Executing ${filename}`);
    const script = fs.readFileSync(filename, "utf8");
    const parser = new EggParser(script);
    try {
        while (!parser.done) {
            eggEval(parser.expr(), env);
            parser.takeAny(T.WHITESPACE)
        }
    } catch(err) {
        if (args.stack) { console.log(err.stack); }
        console.log(err.message);
    }
}

function repl() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'egglisp> '
    });
    rl.prompt();
    rl.on('line', (line) => {
        try {
            const parser = new EggParser(line);
            let expr = parser.expr();
            parser.assertDone();
            console.log(repr(eggEval(expr, env)));
        } catch(err) {
            if (args.stack) { console.log(err.stack); }
            console.log(`${err.constructor.name}: ${err.message}`);
        }
        rl.prompt();
    });
}
