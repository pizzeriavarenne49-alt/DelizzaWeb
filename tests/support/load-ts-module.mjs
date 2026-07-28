import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const baseRequire = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function resolveAlias(specifier) {
  if (!specifier.startsWith("@/")) {
    return null;
  }

  const candidate = path.join(projectRoot, "src", specifier.slice(2));
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

  for (const extension of extensions) {
    const fullPath = candidate.endsWith(extension) ? candidate : `${candidate}${extension}`;
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
  }

  return candidate;
}

function resolveRelative(fromFile, specifier) {
  const candidate = path.resolve(path.dirname(fromFile), specifier);
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

  for (const extension of extensions) {
    const fullPath = candidate.endsWith(extension) ? candidate : `${candidate}${extension}`;
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
  }

  return candidate;
}

export function loadTsModule(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.Preserve,
    },
    fileName: filePath,
    reportDiagnostics: false,
  }).outputText;

  const cjsModule = { exports: {} };

  const localRequire = (specifier) => {
    const aliasPath = resolveAlias(specifier);
    if (aliasPath) {
      return loadTsModule(aliasPath);
    }

    if (specifier.startsWith(".") || specifier.startsWith("..")) {
      const relativePath = resolveRelative(filePath, specifier);
      if (relativePath.endsWith(".ts") || relativePath.endsWith(".tsx") || relativePath.endsWith(".js") || relativePath.endsWith(".jsx") || relativePath.endsWith(".mjs") || relativePath.endsWith(".cjs")) {
        return loadTsModule(relativePath);
      }
      return baseRequire(relativePath);
    }

    return baseRequire(specifier);
  };

  const wrapped = new vm.Script(`(function (exports, require, module, __filename, __dirname) {\n${transpiled}\n})`, {
    filename: filePath,
  });
  const execute = wrapped.runInThisContext();
  execute(cjsModule.exports, localRequire, cjsModule, filePath, path.dirname(filePath));
  return cjsModule.exports;
}
