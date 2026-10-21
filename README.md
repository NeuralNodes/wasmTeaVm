# Java → WebAssembly met TeaVM, aangeroepen vanuit JavaScript

Een Maven-project met een **gewone Java-library** die met [TeaVM](https://teavm.org)
naar **WebAssembly (Wasm GC)** wordt gecompileerd. De aldus ontstane `lib.wasm`
wordt via een klein JavaScript-laagje geladen en de Java-methodes worden
rechtstreeks vanuit JS aangeroepen.

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│ Java (src/main/java)        │  TeaVM │ lib.wasm  +  wasm-runtime.js │
│  MathLib / Point / Rgba     │ ─────► │  (geen JS gegenereerd)       │
└─────────────────────────────┘        └───────────────┬──────────────┘
                                                       │ TeaVM.wasmGC.load()
                                     ┌─────────────────▼──────────────┐
                                     │ app.js: lib.factorial(5) …     │
                                     └────────────────────────────────┘
```

## Snel starten

```bash
mvn -B process-classes      # Java compileren + naar Wasm compileren
npm start                   # statische server op http://localhost:8080
```

Open <http://localhost:8080>. Je ziet de uitkomsten van Java-code die in WebAssembly
draait. (Een `file://`-URL werkt niet: browsers mogen `.wasm` niet van schijf laden.)

Zonder Node kan het ook met Python:

```bash
python3 -m http.server 8080 --directory target/web
```

## Testen

```bash
mvn test                    # dezelfde logica op de JVM (JUnit 5)
node tools/smoke-test.mjs   # de echte Wasm-module, geladen in Node.js
```

`tools/smoke-test.mjs` laadt `target/web/wasm-gc/lib.wasm` en controleert alle
geëxporteerde functies, inclusief objecten, `BigInt`, `Int32Array` en exceptions.

## Wat zit waar

| Pad | Inhoud |
| --- | --- |
| `src/main/java/com/example/mathlib/MathLib.java` | De library-API; elke `@JSExport`-static wordt een JS-functie. Tevens TeaVM-entry point (`main`). |
| `src/main/java/com/example/mathlib/Point.java` | Volledig geëxporteerde klasse: constructor, `@JSProperty`-velden, instance-methode. |
| `src/main/java/com/example/mathlib/Rgba.java` | *Overlay type*: je kunt er een gewoon JS-object `{ r, g, b }` aan meegeven. |
| `src/test/java/...` | JUnit-tests op de JVM. |
| `web/` | Demo-pagina (`index.html`, `app.js`, `app.css`). |
| `tools/smoke-test.mjs` | Wasm-rooktest in Node.js. |
| `tools/serve.mjs` | Statische server met het juiste MIME-type voor `.wasm`. |

Na de build staat alles bij elkaar in `target/web`:

```
target/web/index.html
target/web/app.js
target/web/wasm-gc/lib.wasm             ← de gecompileerde Java-code
target/web/wasm-gc/lib.wasm-runtime.js  ← TeaVM-loader (ES-module met `load`)
target/web/wasm-gc/lib.wasm.teadbg      ← debuginfo voor stacktraces (optioneel)
```

## Hoe het werkt

### 1. Java-kant: `@JSExport`

```java
public final class MathLib {
    @JSExport
    public static long factorial(int n) { … }

    @JSExport
    public static Point midpoint(Point a, Point b) { … }
}
```

* `@JSExport` op **static** methodes in de *main class* → losse functies in
  `teavm.exports` (`lib.factorial(5)`).
* Statics in andere klassen komen onder de klassenaam terecht
  (`lib.MathLib.factorial`), instance-members op het prototype.
* Een klasse met `@JSExport` op constructor/getters/methodes wordt een echte
  JS-klasse: `new lib.Point(3, 4)`, `pt.x`, `pt.distanceTo(other)`,
  `pt instanceof lib.Point`.
* Een interface die `JSObject` extendt (zoals `Rgba`) is een *overlay type*:
  JS hoeft geen Java-object te maken, een object met de juiste properties volstaat.

### 2. Build-kant (pom.xml)

De `teavm-maven-plugin` doet twee dingen:

```xml
<goal>compile</goal>                        <!-- Java bytecode → lib.wasm -->
<goal>copy-webassembly-gc-runtime</goal>    <!-- lib.wasm-runtime.js -->
```

Met `<targetType>WEBASSEMBLY_GC</targetType>`, `<targetDirectory>` en
`<runtimeFileName>`. De runtime wordt met `<modular>true</modular>` als
**ES-module** gegenereerd, zodat je in JS gewoon `import { load }` kunt gebruiken.

Benodigde dependencies: `org.teavm:teavm-classlib` (Java class library voor TeaVM)
en `org.teavm:teavm-jso` (de `@JSExport`/`@JSProperty`/`JSObject`-API). Beide
`provided`: ze zijn alleen bij het compileren nodig.

> TeaVM eist een entry point. Daarom heeft `MathLib` een triviale
> `main(String[])` en staat die klasse als `<mainClass>` in de pom. De Wasm-runtime
> roept hem aan met `lib.main([])`.

### 3. JS-kant: laden en aanroepen

```js
import { load } from "./wasm-gc/lib.wasm-runtime.js";

const teavm = await load("./wasm-gc/lib.wasm");
const lib = teavm.exports;

lib.factorial(10);            // 3628800n
lib.primesUpTo(20);           // Int32Array(8) [2, 3, 5, 7, 11, 13, 17, 19]
lib.greet("Ada");             // "Hallo Ada! …"
lib.describeColor({ r: 255, g: 128, b: 0 });
new lib.Point(3, 4).distanceTo(lib.Point.origin());
```

In Node.js gaat dat identiek:

```js
const { load } = await import("./target/web/wasm-gc/lib.wasm-runtime.js");
const teavm = await load("./target/web/wasm-gc/lib.wasm", { nodejs: true });
```

### 4. Typeconversies waar je op moet letten

| Java | JavaScript |
| --- | --- |
| `int`, `short`, `byte`, `float`, `double`, `boolean` | `number` / `boolean` |
| `long` | **`BigInt`** — `lib.isPrime(7919n)`, uitkomst `120n` |
| `int[]`, `long[]`, … | `Int32Array` / `BigInt64Array` (dus `Array.from(...)` voor gewone arrays) |
| `String` | `string` |
| geëxporteerde klasse | JS-klasse met `instanceof` |
| `JSObject`-subinterface | elk JS-object met de juiste properties |
| `throw new IllegalArgumentException("…")` | JS-`Error` met dezelfde `message` |

## Alternatief: hetzelfde project naar "gewoon" JavaScript

```bash
mvn -B -Pjs process-classes     # extra artifact: target/web/js/lib.js (ES-module)
```

```js
import { factorial, greet, Point } from "./js/lib.js";
```

Dezelfde `@JSExport`-methodes, maar dan als JavaScript in plaats van Wasm.

## Opnieuw beginnen / schoon bouwen

```bash
mvn clean package     # tests + Wasm-build + demo-assets in target/web
node tools/serve.mjs
```

## Problemen oplossen

| Symptoom | Oorzaak/oplossing |
| --- | --- |
| `Kon de Wasm-module niet laden` | Pagina via `file://` geopend. Gebruik `npm start`. |
| `Cannot convert 7919 to a BigInt` | Java `long`-parameter: geef `7919n` mee. |
| `lib.factorial is not a function` | De methode staat niet in de main class → hij hangt onder de klassenaam (`lib.MathLib.factorial`) of is weggeoptimaliseerd. |
| `fiberClass is null` tijdens de build | `org.teavm:teavm-classlib` ontbreekt in de dependencies. |
| `name is null` tijdens de build | Geen `<mainClass>` ingesteld. |
| Browserondersteuning | Wasm GC vereist Chrome 119+, Firefox 120+, Safari 18+. |
