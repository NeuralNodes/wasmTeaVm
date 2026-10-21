package com.example.mathlib;

import org.teavm.jso.JSObject;
import org.teavm.jso.JSProperty;

/**
 * Overlay type: elke JS-methode die een object met r/g/b meegeeft, voldoet.
 * Aan de JS-kant hoef je dus geen Java-object te maken:
 * {@code describeColor({ r: 255, g: 128, b: 0 })}.
 */
public interface Rgba extends JSObject {

    @JSProperty("r")
    int getRed();

    @JSProperty("g")
    int getGreen();

    @JSProperty("b")
    int getBlue();
}
