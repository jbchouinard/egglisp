#!/usr/bin/env node
import { tokenize } from "../parser";
import * as readline from "readline";


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'egglisp-tokenize> '
});
rl.prompt();
rl.on('line', (line) => {
    try {
        let tokens = tokenize(line);
        for (let tok of tokens) {
            console.dir(tok);
        }
    } catch (err) {
        console.log(err.stack);
        console.log(`${err.constructor.name}: ${err.message}`);
    }
    rl.prompt();
});

