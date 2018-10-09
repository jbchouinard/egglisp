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
        } else if (this.parent !== null) {
            return this.parent.get(name);
        } else {
            throw new RuntimeError(`${name} is undefined`);
        }
    }
    setNonLocal(name: string, value: EggValue): void {
        if (this.bindings.has(name)) {
            this.bindings.set(name, value);
        } else if (this.parent !== null) {
            this.parent.setNonLocal(name, value);
        } else {
            throw new RuntimeError(`${name} is undefined`);
        }
    }
    set(name: string, value: EggValue): void {
        if (this.bindings.has(name)) {
            this.bindings.set(name, value);
        } else {
            throw new RuntimeError(`${name} is undefined`);
        }
    }
    def(name: string, value: EggValue) {
        if (this.bindings.has(name)) {
            throw new RuntimeError(`${name} is already defined`);
        }
        this.bindings.set(name, value);
    }
}

