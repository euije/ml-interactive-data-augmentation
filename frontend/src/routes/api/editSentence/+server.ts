/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url } from '../../utils/consts';

// PUT /api/editSentence
// Edit a sentence in the dataset
export const PUT: RequestHandler = async ({ request }) => {
    const { dataset, id, sentence, new_sentence } = await request.json();

    if (!dataset) {
        return new Response(JSON.stringify({ error: 'Dataset parameter is required' }), {
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

    if (!sentence) {
        return new Response(JSON.stringify({ error: 'Sentence parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!new_sentence) {
        return new Response(JSON.stringify({ error: 'New sentence parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const params = new URLSearchParams({ dataset, id, new_sentence });
        const apiUrl = `${api_url}/edit_sentence?${params}`;
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dataset: dataset, id: id, new_sentence: new_sentence }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Edited sentence in ${dataset}:`, sentence);
        console.log(`New sentence:`, new_sentence);

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