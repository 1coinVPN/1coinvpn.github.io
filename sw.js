// Service Worker for Reverse Proxy functionality

// Cache name for storing proxy settings
const CACHE_NAME = '1coinvpn-proxy-cache-v1';
const SETTINGS_KEY = 'proxy-settings';

// Service Worker installation
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Service Worker activation
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Fetch event listener to intercept network requests
self.addEventListener('fetch', event => {
  // Only handle same-origin requests or when proxy is enabled
  if (shouldProxyRequest(event.request)) {
    event.respondWith(handleRequest(event.request));
  }
});

// Function to determine if a request should be proxied
async function shouldProxyRequest(request) {
  // Get proxy settings from cache
  const settings = await getProxySettings();
  
  // If proxy is not enabled, don't intercept
  if (!settings || !settings.enabled) {
    return false;
  }
  
  // Don't proxy requests to the service worker itself
  if (request.url.includes('/sw.js')) {
    return false;
  }
  
  return true;
}

// Main request handler function
async function handleRequest(request) {
  try {
    const settings = await getProxySettings();
    
    if (!settings || !settings.targetUrl) {
      return new Response('プロキシターゲットが設定されていません', { 
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    
    // Start timing for response time measurement
    const startTime = performance.now();
    
    // Create the target URL
    const url = new URL(request.url);
    const targetUrlObj = new URL(settings.targetUrl);
    
    // Construct new URL by combining target origin with current path and query
    const newUrl = targetUrlObj.origin + url.pathname + url.search;
    
    console.log(`Proxying request from ${request.url} to ${newUrl}`);
    
    // Create headers for the new request
    const newHeaders = new Headers();
    
    // If preserve headers is enabled, copy original headers
    if (settings.preserveHeaders) {
      for (const [key, value] of request.headers.entries()) {
        // Skip some headers that might cause issues
        if (!['host', 'origin'].includes(key.toLowerCase())) {
          newHeaders.append(key, value);
        }
      }
    }
    
    // Add proxy-specific headers
    newHeaders.append('X-Forwarded-For', self.location.hostname);
    newHeaders.append('X-Forwarded-Host', url.host);
    newHeaders.append('X-Forwarded-Proto', url.protocol.replace(':', ''));
    
    // Create the new request
    const newRequest = new Request(newUrl, {
      method: request.method,
      headers: newHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.clone().blob() : undefined,
      mode: 'cors',
      credentials: settings.sendCredentials ? 'include' : 'same-origin',
      redirect: 'follow'
    });
    
    // Send the request to the target server
    const response = await fetch(newRequest)
      .catch(error => {
        console.error('Proxy fetch error:', error);
        
        // Update error stats
        updateErrorStats(error.message);
        
        // Return error response
        return new Response(`プロキシエラー: ${error.message}`, { 
          status: 502,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    
    // Calculate response time
    const responseTime = performance.now() - startTime;
    
    // Update stats
    updateStats(response, responseTime);
    
    // Create response headers
    const responseHeaders = new Headers(response.headers);
    
    // Add CORS headers to allow cross-origin access
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    
    // Create and return the modified response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Proxy handler error:', error);
    
    // Update error stats
    updateErrorStats(error.message);
    
    // Return error response
    return new Response(`プロキシエラー: ${error.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// Function to get proxy settings from cache
async function getProxySettings() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(SETTINGS_KEY);
    
    if (!response) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting proxy settings:', error);
    return null;
  }
}

// Function to update proxy settings in cache
async function updateProxySettings(settings) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      SETTINGS_KEY,
      new Response(JSON.stringify(settings), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
    return true;
  } catch (error) {
    console.error('Error updating proxy settings:', error);
    return false;
  }
}

// Function to update stats
async function updateStats(response, responseTime) {
  try {
    // Get content length from response headers
    const contentLength = response.headers.get('content-length') || 0;
    
    // Send message to client with stats update
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'stats-update',
        data: {
          responseTime,
          contentLength: parseInt(contentLength, 10),
          status: response.status,
          url: response.url
        }
      });
    });
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Function to update error stats
async function updateErrorStats(errorMessage) {
  try {
    // Send message to client with error update
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'error-update',
        data: {
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    });
  } catch (error) {
    console.error('Error updating error stats:', error);
  }
}

// Listen for messages from the client
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  if (type === 'update-settings') {
    updateProxySettings(data)
      .then(success => {
        event.source.postMessage({
          type: 'settings-updated',
          success
        });
      });
  }
});
