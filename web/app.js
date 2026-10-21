// Enige wat deze module doet: de Wasm-module laden en de geëxporteerde
// Java-functies aanroepen. De logica zelf zit in de Java-code.
import { load } from "./wasm-gc/lib.wasm-runtime.js";

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const fmt = (value) => (typeof value === "bigint" ? value.toString() : String(value));

let lib;
try {
  // De runtime-loader regelt geheugen, imports en de JS<->Wasm-conversies.
  const teavm = await load("./wasm-gc/lib.wasm");
  lib = teavm.exports;
  lib.main([]); // het Java-entry point

  statusEl.textContent =
    "✓ Wasm-module geladen. Geëxporteerd vanuit Java: " +
    Object.getOwnPropertyNames(lib).sort().join(", ");
  statusEl.classList.add("ok");
} catch (err) {
  statusEl.textContent =
    "Kon de Wasm-module niet laden: " + (err?.message ?? err) +
    "\nOpen deze pagina via een HTTP-server, bijvoorbeeld: node tools/serve.mjs";
  statusEl.classList.add("error");
  throw err;
}

/* ---------- faculteit ---------- */

const facN = $("fac-n");
const facOut = $("fac-out");

function updateFactorial() {
  try {
    facOut.textContent = fmt(lib.factorial(Number(facN.value)));
  } catch (err) {
    facOut.textContent = "fout uit Java: " + err.message;
  }
}
facN.addEventListener("input", updateFactorial);

/* ---------- priemgetallen ---------- */

const primeN = $("prime-n");
const primeOut = $("prime-out");
const primesLimit = $("primes-limit");
const primesOut = $("primes-out");

function updatePrime() {
  const n = BigInt(Math.max(0, Math.trunc(Number(primeN.value) || 0)));
  primeOut.textContent = lib.isPrime(n) ? `${n} is priem` : `${n} is niet priem`;
}
primeN.addEventListener("input", updatePrime);

function updatePrimes() {
  const primes = lib.primesUpTo(Number(primesLimit.value) || 0);
  // Java int[] komt als Int32Array binnen.
  primesOut.textContent = primes.length === 0
    ? "(geen)"
    : `${Array.from(primes).join(", ")} — ${primes.length} stuks`;
}
primesLimit.addEventListener("input", updatePrimes);

/* ---------- strings ---------- */

const greetName = $("greet-name");
const greetOut = $("greet-out");

function updateGreet() {
  greetOut.textContent = lib.greet(greetName.value);
}
greetName.addEventListener("input", updateGreet);

/* ---------- tekstanalyse ---------- */

const wordsText = $("words-text");
const wordsK = $("words-k");
const wordsOut = $("words-out");

function updateWords() {
  const k = Math.max(1, Math.trunc(Number(wordsK.value) || 1));
  const top = lib.topWords(wordsText.value, k);
  const distinct = lib.distinctWords(wordsText.value);
  wordsOut.textContent = `${top}\n${distinct} verschillende woorden`;
}
wordsText.addEventListener("input", updateWords);
wordsK.addEventListener("input", updateWords);

/* ---------- Java-objecten ---------- */

const pointInputs = ["ax", "ay", "bx", "by"].map((id) => $(id));
const pointOut = $("point-out");

function updatePoints() {
  const a = new lib.Point(Number(pointInputs[0].value) || 0, Number(pointInputs[1].value) || 0);
  const b = new lib.Point(Number(pointInputs[2].value) || 0, Number(pointInputs[3].value) || 0);
  const mid = lib.midpoint(a, b);
  pointOut.textContent =
    `A = ${a.label}, B = ${b.label}\n` +
    `afstand = ${a.distanceTo(b).toFixed(3)}, midden = ${mid.label}` +
    `\nis instanceof Point: ${mid instanceof lib.Point}`;
}
pointInputs.forEach((input) => input.addEventListener("input", updatePoints));

/* ---------- overlay type: JS-object naar Java ---------- */

const colorInputs = ["color-r", "color-g", "color-b"].map((id) => $(id));
const colorOut = $("color-out");
const swatch = $("color-swatch");

function updateColor() {
  const [r, g, b] = colorInputs.map((input) => Number(input.value));
  swatch.style.background = `rgb(${r}, ${g}, ${b})`;
  // Gewoon een JS-object: Java ziet het als Rgba met de properties r, g, b.
  colorOut.textContent = lib.describeColor({ r, g, b });
}
colorInputs.forEach((input) => input.addEventListener("input", updateColor));

/* ---------- benchmark ---------- */

const benchBtn = $("bench-btn");
const benchOut = $("bench-out");

function sumOfPrimesInJs(limit) {
  const composite = new Uint8Array(limit + 1);
  let sum = 0;
  for (let i = 2; i <= limit; i++) {
    if (!composite[i]) {
      sum += i;
      for (let j = i * i; j <= limit; j += i) {
        composite[j] = 1;
      }
    }
  }
  return sum;
}

benchBtn.addEventListener("click", () => {
  const limit = 2_000_000;
  benchOut.textContent = "bezig…";

  // Eén warm-up-aanroep zodat we niet de eerste-compilatie meten.
  lib.sumOfPrimesBelow(limit);
  sumOfPrimesInJs(limit);

  const t0 = performance.now();
  const javaSum = lib.sumOfPrimesBelow(limit);
  const t1 = performance.now();
  const jsSum = sumOfPrimesInJs(limit);
  const t2 = performance.now();

  benchOut.textContent =
    `Java/Wasm: ${javaSum} in ${(t1 - t0).toFixed(1)} ms\n` +
    `JavaScript: ${jsSum} in ${(t2 - t1).toFixed(1)} ms` +
    (String(javaSum) === String(jsSum) ? "\n(identieke uitkomst ✓)" : "\n(uitkomsten verschillen!)");
});

/* ---------- eerste keer vullen ---------- */

updateFactorial();
updatePrime();
updatePrimes();
updateGreet();
updateWords();
updatePoints();
updateColor();

// Deelbare link om de benchmark meteen te draaien: index.html#bench
if (location.hash === "#bench") {
  benchBtn.click();
}
