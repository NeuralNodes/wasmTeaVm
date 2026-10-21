package com.example.mathlib;

import org.teavm.jso.JSExport;
import org.teavm.jso.JSProperty;

/**
 * Gewone Java-klasse die volledig naar JavaScript wordt geëxporteerd:
 * de constructor, de properties en de statics komen in de JS-module terecht.
 */
public class Point {

    private final double x;
    private final double y;

    @JSExport
    public Point(double x, double y) {
        this.x = x;
        this.y = y;
    }

    /** Point(0, 0) — een statische factory vanuit JS: Point.origin(). */
    @JSExport
    public static Point origin() {
        return new Point(0, 0);
    }

    @JSExport
    @JSProperty
    public double getX() {
        return x;
    }

    @JSExport
    @JSProperty
    public double getY() {
        return y;
    }

    /** Instance-methode: beschikbaar op elk Point-object in JS. */
    @JSExport
    public double distanceTo(Point other) {
        double dx = x - other.getX();
        double dy = y - other.getY();
        return Math.sqrt(dx * dx + dy * dy);
    }

    @JSExport
    @JSProperty
    public String getLabel() {
        return "(" + x + ", " + y + ")";
    }

    @Override
    public String toString() {
        return "Point" + getLabel();
    }
}
