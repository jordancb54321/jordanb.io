export default {
  fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "www.jordanb.io" || url.hostname === "jordanb-io.pages.dev") {
      url.hostname = "jordanb.io";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};
