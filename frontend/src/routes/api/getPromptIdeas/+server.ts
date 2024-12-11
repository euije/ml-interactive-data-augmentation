/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url } from '../../utils/consts';

// GET /api/getPromptIdeas
// Get prompt ideas for a sentence in the dataset
export const GET: RequestHandler = async ({ url }) => {
    const dataset = url.searchParams.get('dataset');
    const sentence = url.searchParams.get('sentence');

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

    // Construct the URL with query parameters
    const params = new URLSearchParams({ dataset, sentence });
    const apiUrl = `${api_url}/get_prompt_ideas?${params}`;

    console.log('Getting prompt ideas for "', sentence, '" in', dataset);

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const prompt_ideas = data.prompt_ideas;

        return new Response(JSON.stringify({ prompt_ideas: prompt_ideas }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Fetch error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}