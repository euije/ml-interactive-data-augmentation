/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import { interpolateYlOrBr } from 'd3-scale-chromatic';
import { rgb } from 'd3-color';
import chroma from "chroma-js";

// split string into lines of ~maxLen characters, keeping words intact
// return new string, separated by <p> tags
export function splitLines(str: string, maxLen: number = 100) {
    let lines = [];
    let words = str ? str.split(' ') : [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
        if (line.length + words[i].length > maxLen) {
            lines.push(line + '</p>');
            line = '<p>' + words[i];
        } else {
            line += (line.length === 0 ? '' : ' ') + words[i];
        }
    }
    lines.push(line);
    return '<p>' + lines.join('') + '</p>';
}

// count how many words are in a string
export function countWords(str: string) {
    return str ? str.split(' ').length : 0;
}

// colors for categories
const colors1 = chroma.scale("YlOrRd").padding([0.25, 0.1]).colors(7).reverse();
const colors2 = chroma.scale("YlGn").padding([0.35, 0.55]).colors(2);
const colors3 = chroma.scale("YlGnBu").padding([0.35, 0.1]).colors(7);
const colors4 = chroma.scale("RdPu").padding([0.3, 0.1]).colors(7).reverse();

const allColors = chroma.scale(
    colors1.concat(colors2).concat(colors3).concat(colors4)
);

// Function to generate a single color given the total number of colors and an index
export function generateColor(totalColors: number, index: number): number[] {
    if (index < 0 || index > totalColors) {
        throw new Error("Index out of range");
    }
    // Calculate the position (t) in the range [0, 1]
    const t = index / totalColors;
    // Get the color from the color scale
    const color = chroma(allColors(t));

    // Convert the color to RGB
    const rgbColor = color.rgb();

    // Return the color as [r, g, b] array
    return rgbColor;
}

// Function to get the color of a category
export function getCategoryColor(category: string, categoryColors: any): number[] {
    const color = categoryColors.find((c: any) => c.name === category);
    if (color) {
        return color.color;
    } else {
        return [0, 0, 0];
    }
}

// Function to get the color of a sentence based on its length
export function getSentLengthColor(length: number, min: number, max: number): number[] {
    if (min === max) {
        return [0, 0, 0];
    }
    const t = (length - min) / (max - min);
    // start at 0.2 to avoid the lowest values being too light
    const color = interpolateYlOrBr(0.2 + 0.8 * t);
    const rgbColor = rgb(color);
    return [rgbColor.r, rgbColor.g, rgbColor.b];
}

// Function to normalize a value to the range [-1, 1]
export function normalizeVal(value: number, min: number, max: number): number {
    // Normalize the value to the range [-1, 1]
    return 2 * (value - min) / (max - min) - 1;
}

// Helper function to check if a color is light or dark based on its luminance
function isLightColor(r: number, g: number, b: number): boolean {
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

// Helper function to get contrasting background color
export function getContrastingBackground(r: number, g: number, b: number): string {
    return isLightColor(r, g, b) ? 'rgb(16, 24, 34)' : 'rgb(255,255,255,0.8)';
}