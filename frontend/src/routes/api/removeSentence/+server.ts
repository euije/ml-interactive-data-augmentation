/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url } from '../../utils/consts';

// DELETE /api/removeSentence
// Remove a sentence from the dataset
export const DELETE: RequestHandler = async ({ url }) => {
    const dataset = url.searchParams.get('dataset');
    const id = url.searchParams.get('id');

    if (!id) {
        return new Response(JSON.stringify({ error: 'ID parameter is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const apiUrl = `${api_url}/remove_sentence?dataset=${dataset}&id=${id}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Removed point ${id} from dataset ${dataset}:`, data);

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