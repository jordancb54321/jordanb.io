export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "www.jordanb.io" || url.hostname === "jordanb-io.pages.dev") {
      url.hostname = "jordanb.io";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    let response = await env.ASSETS.fetch(request);

    // Resolve clean project URLs explicitly when the asset binding does not.
    // This keeps /learn, /chess, and /sorting working consistently across hosts.
    if (
      response.status === 404
      && request.method === "GET"
      && !url.pathname.endsWith("/")
      && !url.pathname.split("/").pop().includes(".")
    ) {
      const fallbackUrl = new URL(url);
      fallbackUrl.pathname = `${url.pathname}.html`;
      response = await env.ASSETS.fetch(new Request(fallbackUrl, request));
    }

    const headers = new Headers(response.headers);

    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; worker-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
    );
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()");
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    if (url.pathname === "/fractal/app.js") {
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
