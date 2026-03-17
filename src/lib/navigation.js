export function resolveCurrentNavPath(pathname) {
  const normalizedPath = String(pathname ?? "")
    .replace(/\/index\.html$/, "")
    .replace(/\.html$/, "")
    .replace(/\/$/, "") || "/";

  if (normalizedPath.startsWith("/estado/")) return "/estados";
  return normalizedPath;
}
