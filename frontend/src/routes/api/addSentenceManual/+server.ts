/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url } from '../../utils/consts';

// POST /api/addSentenceManual
// Add a sentence to the dataset manually
export const POST: RequestHandler = async ({ request }) => {
    const { dataset, sentence } = await request.json();

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

    try {
        const params = new URLSearchParams({ dataset, sentence });
        const apiUrl = `${api_url}/add_sentence_manual?${params}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dataset, sentence }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Added sentence to ${dataset}:`, sentence);

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