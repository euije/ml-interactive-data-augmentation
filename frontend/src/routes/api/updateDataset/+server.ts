/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url } from '../../utils/consts';
import { countWords, normalizeVal, splitLines } from "../../utils/helpers";

// POST /api/updateDataset
// Change the dataset to display
export const POST: RequestHandler = async ({ request }) => {
    const { dataset } = await request.json();

    console.log('Updating dataset to', dataset);

    try {
        const response = await fetch(`${api_url}/data/${dataset}`);
        const data = await response.json();

        const x_points = data.map((d: any) => d.umap_x);
        const y_points = data.map((d: any) => d.umap_y);
        // find min and max values for x and y
        const x_min = Math.min(...x_points);
        const x_max = Math.max(...x_points);
        const y_min = Math.min(...y_points);
        const y_max = Math.max(...y_points);
        const old_size = data.length;

        const points = data.map((d: any, i: number) => ({
            id: i,
            category: d.Category ? d.Category : d.cluster,
            sentence: d.Context ? d.Context : d.sentence,
            tooltip: d.Context ? splitLines(d.Context) : splitLines(d.sentence),
            length: d.Context ? countWords(d.Context) : countWords(d.sentence),
            x: normalizeVal(d.umap_x, x_min, x_max),
            y: normalizeVal(d.umap_y, y_min, y_max),
        }));

        console.log(`No ${dataset} data in local storage yet, data fetched from server`);
        return new Response(JSON.stringify({ all_data: points, x_min: x_min, x_max: x_max, y_min: y_min, y_max: y_max, old_size }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Fetch error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};