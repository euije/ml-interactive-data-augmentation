/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url, new_category } from '../../utils/consts';
import { countWords, splitLines } from "../../utils/helpers";

// GET /api/interpolateBetweenSentences
// Generate sentences by interpolating between two sentences
export const GET: RequestHandler = async ({ url }) => {
    const dataset = url.searchParams.get('dataset');
    const sent1 = url.searchParams.get('sent1');
    const id1 = url.searchParams.get('id1');
    const sent2 = url.searchParams.get('sent2');
    const id2 = url.searchParams.get('id2');
    const gen_num = url.searchParams.get('genNum');

    if (!dataset) {
        return new Response(JSON.stringify({ error: 'Dataset parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    if (!sent1 || !sent2) {
        return new Response(JSON.stringify({ error: 'Sentence parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    if (!id1 || !id2) {
        return new Response(JSON.stringify({ error: 'Sentence ID parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    if (!gen_num) {
        return new Response(JSON.stringify({ error: 'Generation number parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    console.log(`[INT] Generating ${gen_num} sentences between ${sent1} and ${sent2}`);

    try {
        // Construct the URL with query parameters
        const params = new URLSearchParams({ gen_num, dataset, sent1, id1, sent2, id2 })
        const apiUrl = `${api_url}/interpolate_points?${params}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            const text = await response.text();
            console.error('Server responded with status', response.status, response.statusText);
            console.error('Response body:', text);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const int_id = parseInt(id1);
        const int_id2 = parseInt(id2);
        const cur_date = new Date();

        let new_points;
        if (int_id2 === -1) {
            // user wrote own sentence
            new_points = data.map((d: any, i: number) => ({
                id: i,
                category: new_category,
                sentence: d.sentence,
                tooltip: splitLines(d.sentence),
                length: countWords(d.sentence),
                x: d.umap_x,
                y: d.umap_y,
                og_id: int_id,
                method: "INTERP",
                int_sentence: sent2,
                weight: d.weight.toFixed(2),
                timestamp: cur_date,
            }));
        } else {
            // user selected a sentence
            new_points = data.map((d: any, i: number) => ({
                id: i,
                category: new_category,
                sentence: d.sentence,
                tooltip: splitLines(d.sentence),
                length: countWords(d.sentence),
                x: d.umap_x,
                y: d.umap_y,
                og_id: int_id,
                method: "INTERP",
                int_pt: int_id2,
                weight: d.weight.toFixed(2),
                timestamp: cur_date,
            }));
        }

        return new Response(JSON.stringify({ data: new_points }), {
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