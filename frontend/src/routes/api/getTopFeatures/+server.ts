/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url } from '../../utils/consts';

// GET /api/getTopFeatures
// Get top activated features, similar features, and neighbors for a sentence in the dataset
export const GET: RequestHandler = async ({ url }) => {
    const dataset = url.searchParams.get('dataset');
    const sentence = url.searchParams.get('sentence');
    const id = url.searchParams.get('id');

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

    if (!id) {
        return new Response(JSON.stringify({ error: 'ID parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Construct the URL with query parameters
    const params = new URLSearchParams({ dataset, sentence, id });
    const apiUrl = `${api_url}/top_activations_and_neighbors?${params}`;

    console.log('Getting top activations and neighbors for "', sentence, '" in', dataset);

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const feature_data = data.top_features;
        const neighbor_data = data.neighbors;
        const similar_data = data.similar_features;
        const features = feature_data.map((d: any) => ({
            id: d.feature,
            summary: d.summary,
            activation: d.activation,
            weight: [0]
        }));

        return new Response(JSON.stringify({ features: features, neighbors: neighbor_data, similar_features: similar_data }), {
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