import { EggParser } from "../parser";
import * as readline from "readline";

const parser = new EggParser();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'egglisp-parse> '
});
rl.prompt();
rl.on('line', (line) => {
    try {
        parser.readString(line);
        console.dir(parser.expr(), {depth: null});
        parser.assert_done();
    } catch (err) {
        console.log(err.stack);
        console.log(`${err.constructor.name}: ${err.message}`);
    }
    rl.prompt();
});

