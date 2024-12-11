/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url, new_category } from '../../utils/consts';
import { countWords, splitLines } from "../../utils/helpers";

// GET /api/generateNewSentences
// Generate sentences with SAE features
export const GET: RequestHandler = async ({ url }) => {
    const dataset = url.searchParams.get('dataset');
    const sentence = url.searchParams.get('sentence');
    const sent_id = url.searchParams.get('sent_id');
    const feature_ids = url.searchParams.get('feature_ids');
    const gen_num = url.searchParams.get('genNum');

    if (!dataset) {
        return new Response(JSON.stringify({ error: 'Dataset parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    if (!sentence) {
        return new Response(JSON.stringify({ error: 'Sentence parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    if (!sent_id) {
        return new Response(JSON.stringify({ error: 'Sentence ID parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    if (!feature_ids) {
        return new Response(JSON.stringify({ error: 'Feature IDs parameter is required' }), {
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

    console.log(`[SAE] Generating ${gen_num} new varations of "`, sentence, '" in', dataset);
    console.log('Using features:', feature_ids);

    try {
        // Construct the URL with query parameters
        const params = new URLSearchParams({ gen_num, dataset, sentence, sent_id, feature_ids });
        const apiUrl = `${api_url}/generate_points?${params}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            const text = await response.text();
            console.error('Server responded with status', response.status, response.statusText);
            console.error('Response body:', text);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const int_id = parseInt(sent_id);
        const cur_date = new Date();
        const new_points = data.map((d: any, i: number) => ({
            id: i,
            category: new_category,
            sentence: d.sentence,
            tooltip: splitLines(d.sentence),
            length: countWords(d.sentence),
            x: d.umap_x,
            y: d.umap_y,
            og_id: int_id,
            method: "SAE",
            timestamp: cur_date,
        }));

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