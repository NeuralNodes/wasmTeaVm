package com.example.mathlib;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Dezelfde logica draait op de JVM, zodat je die los kunt testen van TeaVM/Wasm. */
class MathLibTest {

    @Test
    void factorial() {
        assertEquals(1L, MathLib.factorial(0));
        assertEquals(120L, MathLib.factorial(5));
        assertEquals(2432902008176640000L, MathLib.factorial(20));
        assertThrows(IllegalArgumentException.class, () -> MathLib.factorial(-1));
        assertThrows(IllegalArgumentException.class, () -> MathLib.factorial(21));
    }

    @Test
    void primality() {
        assertTrue(MathLib.isPrime(2));
        assertTrue(MathLib.isPrime(7919));
        assertTrue(MathLib.isPrime(1_000_000_007L));
        assertFalse(MathLib.isPrime(1));
        assertFalse(MathLib.isPrime(7917));
    }

    @Test
    void primesUpTo() {
        assertArrayEquals(new int[] {2, 3, 5, 7, 11, 13, 17, 19}, MathLib.primesUpTo(20));
        assertArrayEquals(new int[0], MathLib.primesUpTo(1));
    }

    @Test
    void sumOfPrimesBelow() {
        assertEquals(17L, MathLib.sumOfPrimesBelow(10));
        assertEquals(142913828922L, MathLib.sumOfPrimesBelow(2_000_000));
    }

    @Test
    void strings() {
        assertEquals("Hallo wereld! (deze tekst komt uit Java in WebAssembly)", MathLib.greet("  "));
        assertEquals("Hallo Ada! (deze tekst komt uit Java in WebAssembly)", MathLib.greet("Ada"));
        assertEquals("de (3), vis (3), en (2), zee (1)", MathLib.topWords("De zee en de vis en de vis, vis!", 4));
        assertEquals("", MathLib.topWords("   ", 4));
        assertEquals(4L, MathLib.distinctWords("De zee en de vis en de vis, vis!"));
    }

    @Test
    void points() {
        Point mid = MathLib.midpoint(new Point(0, 0), new Point(4, 10));
        assertEquals(2.0, mid.getX());
        assertEquals(5.0, mid.getY());
        assertEquals(5.0, new Point(0, 0).distanceTo(new Point(3, 4)));
        assertEquals(0.0, Point.origin().distanceTo(Point.origin()));
    }

    @Test
    void sorting() {
        assertArrayEquals(new int[] {1, 2, 3, 4, 9}, MathLib.sorted(new int[] {4, 1, 9, 3, 2}));
    }
}
