# egglisp

A simple Lisp dialect that started as the Egg project from [Eloquent JavaScript](https://eloquentjavascript.net/)
but is now much different.

## Install and Compile

```bash
git clone https://github.com/jbchouinard/egglisp.git
cd egglisp
npm install
tsc
```

## Run

```bash
# Run REPL
node dist/egglisp -i

# Run script
node dist/egglisp lang/func.egglisp

# Run script then REPL
node dist/egglisp -i lang/func.egglisp
```

## Debug Parser
```bash
node dist/debug/tokenize.js
node dist/debug/parse.js
```