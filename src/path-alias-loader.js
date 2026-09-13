import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const aliases = {
  "@config": "src/config",
  "@utils": "src/utils",
  "@middleware": "src/middleware",
  "@features": "src/features",
};

export function resolve(specifier, context, defaultResolve) {
  const alias = Object.keys(aliases).find(
    (name) => specifier === name || specifier.startsWith(`${name}/`),
  );

  if (!alias) {
    return defaultResolve(specifier, context, defaultResolve);
  }

  const aliasPath = specifier.slice(alias.length).replace(/^\/+/, "");
  let targetPath = path.resolve(projectRoot, aliases[alias], aliasPath);

  if (!path.extname(targetPath)) {
    targetPath += ".js";
  }

  return {
    shortCircuit: true,
    url: pathToFileURL(targetPath).href,
  };
}
