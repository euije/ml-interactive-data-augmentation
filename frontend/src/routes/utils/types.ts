/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

// Interface type definitions for the frontend
export interface DropdownItem {
    label: string;
    value: string;
}

export interface FeatureWeight {
    id: number;
    weight: number;
}
export interface Point {
    id: number;
    category: string;
    sentence: string;
    tooltip: string;
    length: number;
    x: number;
    y: number;
    prompt_ideas?: string[];
    og_id?: number; // parent id
    method?: string; // sae, llm, interpolate, or manual
    added_features?: FeatureWeight[]; // for sae
    prompt?: string; // for llm
    int_pt?: number; // for interpolate
    int_sentence?: string; // for interpolate
    weight?: number; // for interpolate
    timestamp?: Date;
    edited?: boolean;
    [key: string]: any;
}

export interface Category {
    name: string;
    count: number;
    minLength: number;
    maxLength: number;
    avgLength: number;
    color: number[];
    [key: string]: any;
}

export interface Feature {
    id: number;
    summary: string;
    activation: number;
    weight: [number];
    [key: string]: any;
}
export interface DatasetInfo {
    all_data: Point[];
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    og_x_min: number;
    og_x_max: number;
    og_y_min: number;
    og_y_max: number;
    old_size: number;
}