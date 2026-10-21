#!/usr/bin/env node
/**
 * Rooktest zonder browser: laadt het door TeaVM gegenereerde .wasm-bestand in
 * Node.js en roept de Java-methodes aan. Draai met:  node tools/smoke-test.mjs
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "..", "target", "web", "wasm-gc");

// De TeaVM-runtime (ES-module variant) exporteert een `load`-functie.
const { load } = await import(pathToFileURL(path.join(dist, "lib.wasm-runtime.js")).href);

const teavm = await load(path.join(dist, "lib.wasm"), { nodejs: true });
const lib = teavm.exports;

// Java `long` wordt in de Wasm GC-backend een JS BigInt; daarom normaliseren we.
const norm = (v) => {
  if (typeof v === "bigint") return v.toString();
  if (ArrayBuffer.isView(v)) return JSON.stringify(Array.from(v)); // Java int[] -> Int32Array
  return JSON.stringify(v);
};

let failed = 0;
function check(label, actual, expected) {
  const ok = norm(actual) === norm(expected);
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"}  ${label}${ok ? "" : ` -> kreeg ${norm(actual)}, verwacht ${norm(expected)}`}`);
}

console.log("Geëxporteerde symbolen:", Object.getOwnPropertyNames(lib).sort().join(", "), "\n");

lib.main([]); // het Java-entry point

check("factorial(5)", lib.factorial(5), 120);
check("factorial(20)", lib.factorial(20), 2432902008176640000n);
check("isPrime(7919n)", lib.isPrime(7919n), true);
check("isPrime(7917n)", lib.isPrime(7917n), false);
check("primesUpTo(20)", lib.primesUpTo(20), [2, 3, 5, 7, 11, 13, 17, 19]);
check("sumOfPrimesBelow(2_000_000)", lib.sumOfPrimesBelow(2000000), 142913828922n);
check("greet('Ada')", lib.greet("Ada"), "Hallo Ada! (deze tekst komt uit Java in WebAssembly)");
check("topWords(...)", lib.topWords("De zee en de vis en de vis, vis!", 4), "de (3), vis (3), en (2), zee (1)");
check("distinctWords(...)", lib.distinctWords("De zee en de vis en de vis, vis!"), 4n);
check("sorted([4,1,9,3,2])", lib.sorted([4, 1, 9, 3, 2]), [1, 2, 3, 4, 9]);

// Java-klassen die naar JS geëxporteerd zijn
const a = new lib.Point(0, 0);
const b = new lib.Point(3, 4);
check("new Point(3,4).x", b.x, 3);
check("new Point(3,4).y", b.y, 4);
check("b instanceof Point", b instanceof lib.Point, true);
check("a.distanceTo(b)", a.distanceTo(b), 5);
check("Point.origin().label", lib.Point.origin().label, "(0.0, 0.0)");
check("midpoint(a, b)", lib.midpoint(a, b).label, "(1.5, 2.0)");

// Overlay type: gewoon een JS-object meegeven, geen Java-object nodig
check("describeColor({r,g,b})", lib.describeColor({ r: 255, g: 128, b: 0 }), "#FF8000 (helderheid 151)");

// Fouten uit Java komen als exception in JS aan
try {
  lib.factorial(-1);
  check("factorial(-1) gooit een fout", "geen fout", "wel een fout");
} catch (e) {
  check("factorial(-1) gooit een fout", typeof e.message === "string" && e.message.includes("n moet >= 0"), true);
}

console.log(failed === 0 ? "\nAlle tests geslaagd." : `\n${failed} test(s) mislukt.`);
process.exit(failed === 0 ? 0 : 1);
