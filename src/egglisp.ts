import * as fs from "fs";
import * as readline from "readline";

import { ArgumentParser } from "argparse";

import Env from "./env";
import { addBuiltins } from "./builtins";
import { eggEval, eggExec, repr } from "./evaluator";
import { EggParser } from "./parser";

const env = new Env(null);
addBuiltins(env);

const argparser = new ArgumentParser();
argparser.addArgument(["-i", "--interactive"], {action: "storeTrue", help: "Start REPL"});
argparser.addArgument("script", {nargs: '?'});
const args = argparser.parseArgs();

if (args.script !== null) {
    const script = fs.readFileSync(args.script, "utf8");
    try {
        eggExec(script, env);
    } catch(err) {
        console.log(err.stack);
        console.log();
        console.log(`${err.constructor.name}: ${err.message}`);
        process.exit(1);
    }
}

if (args.interactive) {
    repl();
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
