#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { ArgumentParser } from "argparse";
const glob = require("glob");

import Env from "./env";
import { addBuiltins } from "./builtins";
import { eggEval, repr } from "./evaluator";
import { EggParser, T } from "./parser";

const argparser = new ArgumentParser({description: "egglisp v0.1.0"});
argparser.addArgument(["-i", "--interactive"], {action: "storeTrue", help: "Start REPL"});
argparser.addArgument("scripts", {nargs: '*'});
const args = argparser.parseArgs();

// Create global env
const env = new Env(null);
addBuiltins(env);

// Exec language files
glob(path.join(__dirname, 'lang/*.egglisp'), function(err, filenames) {
    if (err !== null) { throw err; }
    filenames.forEach(execFile);
});

// Exec CLI-specified scripts
args.scripts.forEach(execFile);

if (args.interactive || args.scripts.length === 0) {
    repl();
}

function execFile(filename) {
    const script = fs.readFileSync(filename, "utf8");
    const parser = new EggParser();
    parser.readString(script);
    try {
        while (!parser.done()) {
            eggEval(parser.expr(), env);
            if (!parser.done()) {
                parser.expect(T.WS)
            }
        }
    } catch(err) {
        console.log(`Error at line ${parser.loc()}`);
        console.log(err.message);
    }
}

function repl() {
    const parser = new EggParser();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'egglisp> '
    });
    rl.prompt();
    rl.on('line', (line) => {
        try {
            parser.readString(line);
            let expr = parser.expr();
            parser.assert_done();
            console.log(repr(eggEval(expr, env)));
        } catch(err) {
            // console.log(err.stack);
            console.log(`${err.constructor.name}: ${err.message}`);
        }
        rl.prompt();
    });
}
