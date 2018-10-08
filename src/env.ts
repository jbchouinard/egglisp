import { RuntimeError } from "./errors";
import { EggValue } from "./types";

export default class Env {
    parent: Env | null;
    bindings: Map<string, EggValue>;
    constructor(parent: Env) {
        this.parent = parent;
        this.bindings = new Map();
    }
    get(name: string): EggValue {
        if (this.bindings.has(name)) {
            return this.bindings.get(name);
        } else if (this.parent !== undefined) {
            return this.parent.get(name);
        } else {
            throw new RuntimeError(`${name} is undefined`);
        }
    }
    set(name: string, value: EggValue) {
        this.bindings.set(name, value);
    }
}

