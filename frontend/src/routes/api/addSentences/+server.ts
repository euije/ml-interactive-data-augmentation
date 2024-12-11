/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url } from '../../utils/consts';

// POST /api/addSentences
// Add multiple sentences to the dataset upon loading
export const POST: RequestHandler = async ({ request }) => {
    const { dataset, sentences, total_sentences } = await request.json();

    if (!dataset) {
        return new Response(JSON.stringify({ error: 'Dataset parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!sentences) {
        return new Response(JSON.stringify({ error: 'Sentences parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!total_sentences) {
        return new Response(JSON.stringify({ error: 'Total sentences parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const num_sentences = sentences.length;

    try {
        const params = new URLSearchParams({ dataset, sentences, total_sentences });
        const apiUrl = `${api_url}/add_sentences?${params}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dataset, sentences, total_sentences }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Added ${num_sentences} sentences to ${dataset}:`, data);

        return new Response(JSON.stringify(data), {
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