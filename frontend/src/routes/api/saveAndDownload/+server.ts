/*
 * For licensing see accompanying LICENSE file.
 * Copyright (C) 2024 Apple Inc. All Rights Reserved.
 */

import type { RequestHandler } from "@sveltejs/kit";
import { api_url } from '../../utils/consts';

// POST /api/saveAndDownload
// Download the dataset to a local file
export const POST: RequestHandler = async ({ request }) => {
    const { dataset, data, filename } = await request.json();
    console.log(`Downloading ${dataset} dataset to ${filename}...`);

    try {
        const response = await fetch(`${api_url}/download_data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename, data })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const resp_data = await response.json();
        console.log(`Saved file`);

        return new Response(JSON.stringify(resp_data), {
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