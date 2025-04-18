import { serveDir, serveFile } from "@std/http";
Deno.serve((req: Request) => {
    const pathname = new URL(req.url).pathname;
    if (pathname === "/") {
        return serveFile(req, "coverage/html/index.html");
    }

    if (pathname.startsWith("/")) {
        return serveDir(req, {
            fsRoot: "coverage/html",
            urlRoot: "",
        });
    }

    return new Response("404: Not Found", {
        status: 404,
    });
});
