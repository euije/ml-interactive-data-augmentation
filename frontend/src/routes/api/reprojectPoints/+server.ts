/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url } from '../../utils/consts';
import { normalizeVal } from "../../utils/helpers";

// POST /api/reprojectPoints
// Reproject points in the dataset by creating a new UMAP embedding
export const POST: RequestHandler = async ({ request }) => {
    const { dataset } = await request.json();
    console.log('Reprojecting points in:', dataset);
    try {
        const apiUrl = `${api_url}/reembed_sentences`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dataset }),
        });
        const data = await response.json();

        const x_points = data.map((d: any) => d.umap_x);
        const y_points = data.map((d: any) => d.umap_y);
        // find min and max values for x and y
        const x_min = Math.min(...x_points);
        const x_max = Math.max(...x_points);
        const y_min = Math.min(...y_points);
        const y_max = Math.max(...y_points);

        const points = data.map((d: any) => ({
            x: normalizeVal(d.umap_x, x_min, x_max),
            y: normalizeVal(d.umap_y, y_min, y_max),
        }));
        return new Response(JSON.stringify({ new_data: points, x_min: x_min, x_max: x_max, y_min: y_min, y_max: y_max }), {
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