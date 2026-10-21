package com.example.mathlib;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.teavm.jso.JSExport;

/**
 * Kleine Java-"bibliotheek" die met TeaVM naar WebAssembly wordt gecompileerd
 * en daarna vanuit JavaScript wordt aangeroepen.
 *
 * <p>Elke methode met {@code @JSExport} komt als losse functie in
 * {@code teavm.exports} terecht en is dus direct vanuit JS te gebruiken.</p>
 *
 * <p>Deze klasse is tevens het TeaVM-entry point: de TeaVM-build heeft altijd een
 * {@code main} nodig (statics met {@code @JSExport} in de main-class worden
top-level geëxporteerd).</p>
 */
public final class MathLib {

    private MathLib() {
    }

    /** Wordt door de Wasm-runtime aangeroepen via {@code teavm.exports.main([])}. */
    public static void main(String[] args) {
        System.out.println("mathlib-wasm: Java in WebAssembly is geladen ("
                + primesUpTo(50).length + " priemen onder 50)");
    }

    /** Faculteit van n (0 &lt;= n &lt;= 20). */
    @JSExport
    public static long factorial(int n) {
        if (n < 0) {
            throw new IllegalArgumentException("n moet >= 0 zijn");
        }
        if (n > 20) {
            throw new IllegalArgumentException("n moet <= 20 zijn (anders overflow van long)");
        }
        long result = 1;
        for (int i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    /** Priemtest via trial division (long-veilig). */
    @JSExport
    public static boolean isPrime(long n) {
        if (n < 2) {
            return false;
        }
        if (n % 2 == 0) {
            return n == 2;
        }
        for (long d = 3; d <= n / d; d += 2) {
            if (n % d == 0) {
                return false;
            }
        }
        return true;
    }

    /** Alle priemgetallen kleiner of gelijk aan limit; Java int[] wordt een JS-array. */
    @JSExport
    public static int[] primesUpTo(int limit) {
        if (limit < 2) {
            return new int[0];
        }
        boolean[] composite = new boolean[limit + 1];
        int count = 0;
        for (int i = 2; i <= limit; i++) {
            if (!composite[i]) {
                count++;
                for (long j = (long) i * i; j <= limit; j += i) {
                    composite[(int) j] = true;
                }
            }
        }
        int[] primes = new int[count];
        int k = 0;
        for (int i = 2; i <= limit; i++) {
            if (!composite[i]) {
                primes[k++] = i;
            }
        }
        return primes;
    }

    /** String in- en uitvoer over de Wasm-grens heen. */
    @JSExport
    public static String greet(String name) {
        String clean = (name == null || name.isBlank()) ? "wereld" : name.trim();
        return "Hallo " + clean + "! (deze tekst komt uit Java in WebAssembly)";
    }

    /**
     * Top-k woorden uit een tekst, gesorteerd op frequentie.
     * Laat zien dat de Java class library (collections, sorteren) werkt.
     */
    @JSExport
    public static String topWords(String text, int k) {
        if (text == null || text.isBlank() || k <= 0) {
            return "";
        }
        Map<String, Integer> freq = new HashMap<>();
        for (String word : tokenize(text)) {
            freq.merge(word, 1, Integer::sum);
        }
        List<Map.Entry<String, Integer>> entries = new ArrayList<>(freq.entrySet());
        entries.sort((a, b) -> {
            int byCount = Integer.compare(b.getValue(), a.getValue());
            return byCount != 0 ? byCount : a.getKey().compareTo(b.getKey());
        });
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < Math.min(k, entries.size()); i++) {
            if (sb.length() > 0) {
                sb.append(", ");
            }
            sb.append(entries.get(i).getKey()).append(" (").append(entries.get(i).getValue()).append(')');
        }
        return sb.toString();
    }

    /** Aantal verschillende woorden — bewust met de Streams-API opgebouwd. */
    @JSExport
    public static long distinctWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return Stream.of(tokenize(text)).distinct().count();
    }

    /** Handmatige tokenizer: alleen letters/cijfers/'. */
    private static String[] tokenize(String text) {
        List<String> words = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < text.length(); i++) {
            char c = Character.toLowerCase(text.charAt(i));
            if (Character.isLetterOrDigit(c) || c == '\'') {
                current.append(c);
            } else if (current.length() > 0) {
                words.add(current.toString());
                current.setLength(0);
            }
        }
        if (current.length() > 0) {
            words.add(current.toString());
        }
        return words.toArray(new String[0]);
    }

    /** Java-objecten (geëxporteerde klasse) als parameter en returnwaarde. */
    @JSExport
    public static Point midpoint(Point a, Point b) {
        return new Point((a.getX() + b.getX()) / 2.0, (a.getY() + b.getY()) / 2.0);
    }

    /** JS-objecten (overlay types) als parameter: elk JS-object met r/g/b werkt. */
    @JSExport
    public static String describeColor(Rgba color) {
        int r = clamp(color.getRed());
        int g = clamp(color.getGreen());
        int b = clamp(color.getBlue());
        return String.format("#%02X%02X%02X (helderheid %d)", r, g, b, (r * 299 + g * 587 + b * 114) / 1000);
    }

    /** Een beetje rekenwerk zodat je in de demo het verschil in snelheid kunt zien. */
    @JSExport
    public static long sumOfPrimesBelow(int limit) {
        long sum = 0;
        for (int p : primesUpTo(limit)) {
            sum += p;
        }
        return sum;
    }

    /** Handig voor de demo: sorteert een lijst getallen die je uit JS doorgeeft. */
    @JSExport
    public static int[] sorted(int[] values) {
        int[] copy = Arrays.copyOf(values, values.length);
        Arrays.sort(copy);
        return copy;
    }

    private static int clamp(int value) {
        return Math.max(0, Math.min(255, value));
    }
}
