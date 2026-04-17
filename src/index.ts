// Updated implementation for Cloudflare Workers

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    // Implement your backend logic with multiple backend support here
    const url = new URL(request.url);

    let backendResponse;
    switch (url.hostname) {
        case 'backend1.example.com':
            backendResponse = await fetch('https://backend1.example.com' + url.pathname);
            break;
        case 'backend2.example.com':
            backendResponse = await fetch('https://backend2.example.com' + url.pathname);
            break;
        default:
            backendResponse = new Response('Not found', { status: 404 });
    }

    return backendResponse;
}