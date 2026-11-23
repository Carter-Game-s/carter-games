import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GetMoreMath2.0",
    short_name: "GetMoreMath2.0",
    description: "Browser games, movies, soundboard, and player chat.",
    start_url: "/",
    display: "standalone",
    icons: [{ src: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
  };
}
