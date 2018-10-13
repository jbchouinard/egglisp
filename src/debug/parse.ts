#!/usr/bin/env node
import { EggParser } from "../parser";
import * as readline from "readline";


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'egglisp-parse> '
});
rl.prompt();
rl.on('line', (line) => {
    try {
        const parser = new EggParser(line);
        console.dir(parser.expr(), {depth: null});
        parser.assertDone();
    } catch (err) {
        console.log(err.stack);
        console.log(`${err.constructor.name}: ${err.message}`);
    }
    rl.prompt();
});

