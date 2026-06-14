import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const schemaIndexPath = path.join(repoRoot, "studio-tandra-peters/schemaTypes/index.ts");
const schemaTypesRoot = path.join(repoRoot, "studio-tandra-peters/schemaTypes");
const generatedSanityDir = path.join(repoRoot, "src/sanity/generated");
const generatedComponentsDir = path.join(repoRoot, "src/components/generated");
const homeQueryPath = path.join(repoRoot, "src/sanity/queries.ts");
const homeMapperPath = path.join(repoRoot, "src/sanity/mapSanityHome.tsx");
const homePagePath = path.join(repoRoot, "src/pages/Home.tsx");

const FIELD_TYPE_OPTIONS = [
  "string",
  "text",
  "number",
  "boolean",
  "url",
  "date",
  "datetime",
  "slug",
  "image",
  "reference",
  "array-string",
  "array-reference",
  "portable-text",
];

const toWords = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim();

const toTitleCase = (value) =>
  toWords(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const toCamelCase = (value) => {
  const parts = toWords(value).toLowerCase().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "";
  }

  return parts
    .map((part, index) => (index === 0 ? part : part[0].toUpperCase() + part.slice(1)))
    .join("");
};

const toPascalCase = (value) => {
  const camel = toCamelCase(value);
  return camel ? camel[0].toUpperCase() + camel.slice(1) : "";
};

const toConstCase = (value) => toWords(value).replace(/\s+/g, "_").toUpperCase();

const indentBlock = (block, indent) =>
  block
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const askYesNo = async (rl, prompt, defaultValue = true) => {
  const suffix = defaultValue ? " [Y/n]: " : " [y/N]: ";
  const answer = (await rl.question(`${prompt}${suffix}`)).trim().toLowerCase();

  if (!answer) {
    return defaultValue;
  }

  return answer === "y" || answer === "yes";
};

const askNonEmpty = async (rl, prompt, fallback = "") => {
  for (;;) {
    const answer = (
      await rl.question(fallback ? `${prompt} (${fallback}): ` : `${prompt}: `)
    ).trim();

    if (answer) {
      return answer;
    }

    if (fallback) {
      return fallback;
    }

    console.log("Please enter a value.");
  }
};

const askFieldType = async (rl) => {
  for (;;) {
    const answer = (await rl.question(`Field type [${FIELD_TYPE_OPTIONS.join(", ")}]: `))
      .trim()
      .toLowerCase();

    if (FIELD_TYPE_OPTIONS.includes(answer)) {
      return answer;
    }

    console.log("Invalid type. Pick one from the list above.");
  }
};

const renderSchemaField = (field) => {
  const lines = ["defineField({", `  name: "${field.name}",`, `  title: "${field.title}",`];

  if (
    ["string", "text", "number", "boolean", "url", "date", "datetime", "image"].includes(field.type)
  ) {
    lines.push(`  type: "${field.type}",`);
  }

  if (field.type === "text") {
    lines.push("  rows: 3,");
  }

  if (field.type === "slug") {
    lines.push('  type: "slug",');
    lines.push("  options: {");
    lines.push(`    source: "${field.slugSource || "title"}",`);
    lines.push("  },");
  }

  if (field.type === "reference") {
    lines.push('  type: "reference",');
    lines.push(`  to: [{ type: "${field.referenceTo}" }],`);
  }

  if (field.type === "array-string") {
    lines.push('  type: "array",');
    lines.push('  of: [defineArrayMember({ type: "string" })],');
  }

  if (field.type === "array-reference") {
    lines.push('  type: "array",');
    lines.push(
      `  of: [defineArrayMember({ type: "reference", to: [{ type: "${field.referenceTo}" }] })],`,
    );
  }

  if (field.type === "portable-text") {
    lines.push('  type: "array",');
    lines.push('  of: [defineArrayMember({ type: "block" })],');
  }

  if (field.required) {
    lines.push("  validation: (Rule) => Rule.required(),");
  }

  lines.push("})");
  return lines.join("\n");
};

const listSchemaTypeFiles = async (rootDir) => {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return listSchemaTypeFiles(fullPath);
      }
      if (entry.isFile() && fullPath.endsWith(".ts")) {
        return [fullPath];
      }
      return [];
    }),
  );

  return files.flat();
};

const discoverExistingSchemaTypes = async () => {
  const files = await listSchemaTypeFiles(schemaTypesRoot);
  const discovered = [];

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    const match = source.match(
      /defineType\s*\(\s*\{[\s\S]*?name:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?type:\s*"([^"]+)"[\s\S]*?\}\s*\)/,
    );

    if (!match) {
      continue;
    }

    const [, name, title, kind] = match;
    discovered.push({
      name,
      title,
      kind,
      filePath,
      relativePath: path.relative(repoRoot, filePath),
    });
  }

  discovered.sort((a, b) => a.name.localeCompare(b.name));
  return discovered;
};

const findMatchingBracket = (source, openIndex) => {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
};

const ensureDefineArrayMemberImport = (source) => {
  const needsImport = source.includes("defineArrayMember");
  if (needsImport) {
    return source;
  }

  return source.replace(/import\s*\{([^}]+)\}\s*from\s*"sanity";/, (_match, imports) => {
    const parts = imports
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.includes("defineArrayMember")) {
      return _match;
    }
    const nextImports = [...parts, "defineArrayMember"];
    return `import { ${nextImports.join(", ")} } from "sanity";`;
  });
};

const appendFieldsToExistingSchema = (source, fieldBlocks) => {
  const fieldsKeyIndex = source.indexOf("fields:");
  if (fieldsKeyIndex === -1) {
    throw new Error("Could not find fields array in selected schema.");
  }

  const openBracketIndex = source.indexOf("[", fieldsKeyIndex);
  if (openBracketIndex === -1) {
    throw new Error("Could not parse fields array open bracket.");
  }

  const closeBracketIndex = findMatchingBracket(source, openBracketIndex);
  if (closeBracketIndex === -1) {
    throw new Error("Could not parse fields array closing bracket.");
  }

  const closeLineStart = source.lastIndexOf("\n", closeBracketIndex) + 1;
  const closeLine = source.slice(closeLineStart, closeBracketIndex);
  const closeIndent = closeLine.match(/^\s*/)?.[0] ?? "";
  const itemIndent = `${closeIndent}  `;

  const fieldSource = fieldBlocks.map((block) => indentBlock(block, itemIndent)).join(",\n\n");
  const arrayBody = source.slice(openBracketIndex + 1, closeBracketIndex);
  const hasEntries = arrayBody.trim().length > 0;

  const insertion = hasEntries
    ? `,\n\n${fieldSource}\n${closeIndent}`
    : `\n${fieldSource}\n${closeIndent}`;

  return `${source.slice(0, closeBracketIndex)}${insertion}${source.slice(closeBracketIndex)}`;
};

const ensureHomeQueryBirdcreekProjection = (source, fields) => {
  const homeBlockStart = source.indexOf('"home": *[_id == "homePage"][0]{');
  if (homeBlockStart === -1) {
    throw new Error("Could not find homePage query block in src/sanity/queries.ts.");
  }

  const insertAnchor = source.indexOf("hero {", homeBlockStart);
  if (insertAnchor === -1) {
    throw new Error("Could not find insertion anchor in HOME_AND_SITE_QUERY.");
  }

  const linesToInsert = [];
  const hasVimeoField = fields.some((field) =>
    ["vimeoUrl", "birdcreekVimeoUrl"].includes(field.name),
  );
  const hasTitleField = fields.some((field) =>
    ["title", "birdcreekVideoTitle"].includes(field.name),
  );

  if (
    hasVimeoField &&
    !source.includes('"birdcreekVimeoUrl": coalesce(birdcreekVimeoUrl, vimeoUrl),')
  ) {
    linesToInsert.push('    "birdcreekVimeoUrl": coalesce(birdcreekVimeoUrl, vimeoUrl),');
  }

  if (
    hasTitleField &&
    !source.includes('"birdcreekVideoTitle": coalesce(birdcreekVideoTitle, title),')
  ) {
    linesToInsert.push('    "birdcreekVideoTitle": coalesce(birdcreekVideoTitle, title),');
  }

  if (!linesToInsert.length) {
    return source;
  }

  const insertion = `${linesToInsert.join("\n")}\n`;
  return `${source.slice(0, insertAnchor)}${insertion}${source.slice(insertAnchor)}`;
};

const ensureHomeMapperBirdcreek = (source) => {
  if (source.includes("export const mapBirdcreekVideoBannerProps")) {
    return source;
  }

  const marker = "export const mapAboutProps =";
  const insertAt = source.indexOf(marker);
  if (insertAt === -1) {
    throw new Error("Could not find mapAboutProps marker in mapSanityHome.tsx.");
  }

  const functionSource = `export const mapBirdcreekVideoBannerProps = (\n  data: SanityDoc,\n): Partial<{ vimeoUrl: string; title: string }> => {\n  if (!data) {\n    return {};\n  }\n\n  const rawVimeoUrl =\n    typeof data.birdcreekVimeoUrl === "string"\n      ? data.birdcreekVimeoUrl\n      : typeof data.vimeoUrl === "string"\n        ? data.vimeoUrl\n        : undefined;\n\n  const rawTitle =\n    typeof data.birdcreekVideoTitle === "string"\n      ? data.birdcreekVideoTitle\n      : typeof data.title === "string"\n        ? data.title\n        : undefined;\n\n  const vimeoUrl = typeof rawVimeoUrl === "string" ? stegaClean(rawVimeoUrl).trim() : "";\n  const title = typeof rawTitle === "string" ? stegaClean(rawTitle).trim() : "";\n\n  return {\n    ...(vimeoUrl ? { vimeoUrl } : {}),\n    ...(title ? { title } : {}),\n  };\n};\n\n`;

  return `${source.slice(0, insertAt)}${functionSource}${source.slice(insertAt)}`;
};

const ensureHomePageBirdcreekConsumption = (source) => {
  let next = source;

  if (!next.includes("mapBirdcreekVideoBannerProps")) {
    next = next.replace(
      /import\s*\{([\s\S]*?)\}\s*from\s*'\.\.\/sanity\/mapSanityHome'/,
      (_match, imports) => {
        const parsedImports = imports
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        if (!parsedImports.includes("mapBirdcreekVideoBannerProps")) {
          parsedImports.splice(2, 0, "mapBirdcreekVideoBannerProps");
        }
        return `import { ${parsedImports.join(", ")} } from '../sanity/mapSanityHome'`;
      },
    );
  }

  if (!next.includes("const birdcreekVideoProps = mapBirdcreekVideoBannerProps(home)")) {
    const anchor =
      "const serviceAreaMap = home?.serviceAreaMap as Record<string, unknown> | undefined\n";
    if (!next.includes(anchor)) {
      throw new Error("Could not find home serviceAreaMap anchor for mapper insertion.");
    }
    next = next.replace(
      anchor,
      `${anchor}  const birdcreekVideoProps = mapBirdcreekVideoBannerProps(home)\n`,
    );
  }

  if (next.includes("<BirdcreekVideoBanner />")) {
    next = next.replace(
      "<BirdcreekVideoBanner />",
      "<BirdcreekVideoBanner {...birdcreekVideoProps} />",
    );
  }

  return next;
};

const autoWireHomeBirdcreek = async (fields) => {
  const includesBirdcreekRelatedField = fields.some((field) =>
    ["vimeoUrl", "birdcreekVimeoUrl", "title", "birdcreekVideoTitle"].includes(field.name),
  );

  if (!includesBirdcreekRelatedField) {
    return {
      updated: false,
      reason:
        "No Birdcreek-related fields were added (expected one of: vimeoUrl, birdcreekVimeoUrl, title, birdcreekVideoTitle).",
    };
  }

  const [querySource, mapperSource, homeSource] = await Promise.all([
    readFile(homeQueryPath, "utf8"),
    readFile(homeMapperPath, "utf8"),
    readFile(homePagePath, "utf8"),
  ]);

  const nextQuerySource = ensureHomeQueryBirdcreekProjection(querySource, fields);
  const nextMapperSource = ensureHomeMapperBirdcreek(mapperSource);
  const nextHomeSource = ensureHomePageBirdcreekConsumption(homeSource);

  await Promise.all([
    writeFile(homeQueryPath, nextQuerySource, "utf8"),
    writeFile(homeMapperPath, nextMapperSource, "utf8"),
    writeFile(homePagePath, nextHomeSource, "utf8"),
  ]);

  return { updated: true };
};

const toTypeScriptType = (field) => {
  switch (field.type) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array-string":
      return "string[]";
    case "array-reference":
      return "Array<{ _id?: string; _type?: string }>;";
    case "portable-text":
      return "unknown[]";
    case "image":
      return "{ asset?: { url?: string } }";
    case "reference":
      return "{ _id?: string; _type?: string }";
    default:
      return "string";
  }
};

const toQueryProjectionLine = (field) => {
  switch (field.type) {
    case "slug":
      return `"${field.name}": ${field.name}.current`;
    case "image":
      return `${field.name}{ asset->{ url } }`;
    case "reference":
      return `${field.name}->{ _id, _type }`;
    case "array-reference":
      return `${field.name}[]->{ _id, _type }`;
    default:
      return field.name;
  }
};

const ensureFileWithExports = async (indexPath, exportLine) => {
  const exists = await fileExists(indexPath);
  if (!exists) {
    await writeFile(indexPath, `${exportLine}\n`, "utf8");
    return;
  }

  const source = await readFile(indexPath, "utf8");
  if (source.includes(exportLine)) {
    return;
  }

  await writeFile(indexPath, `${source.trimEnd()}\n${exportLine}\n`, "utf8");
};

const registerSchemaType = async ({ importPath, exportName }) => {
  const source = await readFile(schemaIndexPath, "utf8");

  const importLine = `import { ${exportName} } from "${importPath}";`;
  let nextSource = source;

  if (!nextSource.includes(importLine)) {
    const insertAt = nextSource.indexOf("export const schemaTypes = [");
    if (insertAt === -1) {
      throw new Error("Could not find schemaTypes array in schemaTypes/index.ts");
    }
    nextSource = `${nextSource.slice(0, insertAt)}${importLine}\n${nextSource.slice(insertAt)}`;
  }

  if (!nextSource.includes(`  ${exportName},`)) {
    nextSource = nextSource.replace(
      /export const schemaTypes = \[([\s\S]*?)\];/,
      (_match, body) => `export const schemaTypes = [${body}  ${exportName},\n];`,
    );
  }

  await writeFile(schemaIndexPath, nextSource, "utf8");
};

const main = async () => {
  const rl = createInterface({ input, output });

  try {
    console.log("\nSanity component scaffolder");
    console.log("Create new schema bundles OR extend an existing schema with new fields.\n");

    const modeInput = (await askNonEmpty(rl, "Mode (create/extend)", "create")).toLowerCase();
    const mode = modeInput === "extend" ? "extend" : "create";

    if (mode === "extend") {
      const existingTypes = await discoverExistingSchemaTypes();
      if (!existingTypes.length) {
        console.log("No existing schema types were discovered.");
        return;
      }

      console.log("\nDiscovered schema types:");
      existingTypes.forEach((item, index) => {
        console.log(
          `${index + 1}. ${item.name} (${item.kind}) — ${item.title} [${item.relativePath}]`,
        );
      });

      const selection = await askNonEmpty(rl, "Select type by number or type name", "homePage");

      const selectionNumber = Number(selection);
      const selected = Number.isInteger(selectionNumber)
        ? existingTypes[selectionNumber - 1]
        : existingTypes.find((item) => item.name === selection || item.title === selection);

      if (!selected) {
        throw new Error(`Could not find schema type for selection: ${selection}`);
      }

      const fields = [];
      for (;;) {
        const hasFields = fields.length > 0;
        const shouldAdd = await askYesNo(
          rl,
          hasFields ? "Add another field to this existing schema?" : "Add first new field?",
          true,
        );

        if (!shouldAdd) {
          if (!hasFields) {
            console.log("You need at least one field.");
            continue;
          }
          break;
        }

        const fieldName = toCamelCase(await askNonEmpty(rl, "Field name"));
        const fieldTitle = await askNonEmpty(rl, "Field title", toTitleCase(fieldName));
        const fieldType = await askFieldType(rl);
        const required = await askYesNo(rl, "Required?", false);

        const field = {
          name: fieldName,
          title: fieldTitle,
          type: fieldType,
          required,
        };

        if (fieldType === "reference" || fieldType === "array-reference") {
          field.referenceTo = toCamelCase(await askNonEmpty(rl, "Reference target type"));
        }

        if (fieldType === "slug") {
          field.slugSource = toCamelCase(await askNonEmpty(rl, "Slug source field", "title"));
        }

        fields.push(field);
      }

      const fieldBlocks = fields.map((field) => renderSchemaField(field));
      let schemaSource = await readFile(selected.filePath, "utf8");

      if (
        fields.some((field) =>
          ["array-string", "array-reference", "portable-text"].includes(field.type),
        )
      ) {
        schemaSource = ensureDefineArrayMemberImport(schemaSource);
      }

      const updatedSource = appendFieldsToExistingSchema(schemaSource, fieldBlocks);
      await writeFile(selected.filePath, updatedSource, "utf8");

      let autoWireSummary;
      if (selected.name === "homePage") {
        const shouldAutoWire = await askYesNo(
          rl,
          "Auto-wire matching query + mapper + Home usage for Birdcreek video banner now?",
          true,
        );

        if (shouldAutoWire) {
          autoWireSummary = await autoWireHomeBirdcreek(fields);
        }
      }

      console.log("\n✅ Updated existing schema type.");
      console.log(`- Type:   ${selected.name}`);
      console.log(`- File:   ${selected.relativePath}`);
      console.log(`- Fields: ${fields.map((field) => field.name).join(", ")}`);
      if (autoWireSummary?.updated) {
        console.log(
          "- Wiring: Updated src/sanity/queries.ts, src/sanity/mapSanityHome.tsx, src/pages/Home.tsx",
        );
      } else if (autoWireSummary?.reason) {
        console.log(`- Wiring: Skipped (${autoWireSummary.reason})`);
      }
      console.log("\nNext: add matching query + mapper wiring where this data is consumed.");
      return;
    }

    console.log("This creates a schema type, GROQ query file, and a React component stub.\n");

    const componentNameRaw = await askNonEmpty(rl, "Component name (PascalCase)");
    const componentName = toPascalCase(componentNameRaw);

    const defaultTypeName = toCamelCase(componentNameRaw);
    const typeName = toCamelCase(
      await askNonEmpty(rl, "Sanity type name (camelCase)", defaultTypeName),
    );

    const schemaTitle = await askNonEmpty(rl, "Schema title", toTitleCase(typeName));

    const schemaKindAnswer = (
      await askNonEmpty(rl, "Schema kind (document/object)", "document")
    ).toLowerCase();
    const schemaKind = schemaKindAnswer === "object" ? "object" : "document";

    const fields = [];

    for (;;) {
      const hasFields = fields.length > 0;
      const shouldAdd = await askYesNo(
        rl,
        hasFields ? "Add another field?" : "Add first field?",
        true,
      );

      if (!shouldAdd) {
        if (!hasFields) {
          console.log("You need at least one field.");
          continue;
        }
        break;
      }

      const fieldName = toCamelCase(await askNonEmpty(rl, "Field name"));
      const fieldTitle = await askNonEmpty(rl, "Field title", toTitleCase(fieldName));
      const fieldType = await askFieldType(rl);
      const required = await askYesNo(rl, "Required?", false);

      const field = {
        name: fieldName,
        title: fieldTitle,
        type: fieldType,
        required,
      };

      if (fieldType === "reference" || fieldType === "array-reference") {
        field.referenceTo = toCamelCase(await askNonEmpty(rl, "Reference target type"));
      }

      if (fieldType === "slug") {
        field.slugSource = toCamelCase(await askNonEmpty(rl, "Slug source field", "title"));
      }

      fields.push(field);
    }

    const exportName = `${typeName}Type`;
    const schemaFileName = `${typeName}.ts`;
    const schemaSubDir = schemaKind === "document" ? "documents" : "objects";
    const schemaDir = path.join(schemaTypesRoot, schemaSubDir);
    const schemaFilePath = path.join(schemaDir, schemaFileName);

    const needsArrayMember = fields.some((field) =>
      ["array-string", "array-reference", "portable-text"].includes(field.type),
    );

    const firstStringLikeField =
      fields.find((field) => ["string", "text", "slug"].includes(field.type))?.name || "_id";

    const schemaFields = fields.map((field) => renderSchemaField(field)).join(",\n\n    ");

    const schemaSource = `import { defineField, defineType${needsArrayMember ? ", defineArrayMember" : ""} } from "sanity";\n\nexport const ${exportName} = defineType({\n  name: "${typeName}",\n  title: "${schemaTitle}",\n  type: "${schemaKind}",\n  fields: [\n    ${schemaFields}\n  ],\n  preview: {\n    select: {\n      title: "${firstStringLikeField}",\n    },\n  },\n});\n`;

    await mkdir(schemaDir, { recursive: true });

    if (
      (await fileExists(schemaFilePath)) &&
      !(await askYesNo(rl, `${schemaFileName} exists. Overwrite?`, false))
    ) {
      console.log("Aborted to avoid overwriting existing schema file.");
      return;
    }

    await writeFile(schemaFilePath, schemaSource, "utf8");
    await registerSchemaType({
      importPath: `./${schemaSubDir}/${typeName}`,
      exportName,
    });

    await mkdir(generatedSanityDir, { recursive: true });

    const queryFilePath = path.join(generatedSanityDir, `${typeName}.queries.ts`);
    const projection = fields.map((field) => `    ${toQueryProjectionLine(field)},`).join("\n");
    const constPrefix = toConstCase(typeName);

    const querySource =
      schemaKind === "document"
        ? `import { defineQuery } from "groq";\n\nexport const ${constPrefix}_BY_ID_QUERY = defineQuery(/* groq */ \`*[_type == "${typeName}" && _id == $id][0]{\n${projection}\n  }\`);\n\nexport const ${constPrefix}_LIST_QUERY = defineQuery(/* groq */ \`*[_type == "${typeName}"] | order(_createdAt desc){\n${projection}\n  }\`);\n`
        : `export const ${constPrefix}_FRAGMENT = /* groq */ \`{\n${projection}\n  }\`;\n`;

    await writeFile(queryFilePath, querySource, "utf8");
    await ensureFileWithExports(
      path.join(generatedSanityDir, "index.ts"),
      `export * from "./${typeName}.queries";`,
    );

    await mkdir(generatedComponentsDir, { recursive: true });
    const componentFilePath = path.join(generatedComponentsDir, `${componentName}.tsx`);
    const mapperFilePath = path.join(generatedSanityDir, `map${componentName}.ts`);

    const componentFields = fields
      .map((field) => {
        const type = toTypeScriptType(field);
        const optional = field.required ? "" : "?";
        const normalizedType = type.endsWith(";") ? type.slice(0, -1) : type;
        return `  ${field.name}${optional}: ${normalizedType};`;
      })
      .join("\n");

    const componentSource = `import React from "react";\n\nexport type ${componentName}Data = {\n${componentFields}\n};\n\nexport type ${componentName}Props = {\n  data: ${componentName}Data;\n};\n\nexport function ${componentName}({ data }: ${componentName}Props) {\n  return (\n    <section data-sanity-component="${typeName}">\n      <pre>{JSON.stringify(data, null, 2)}</pre>\n    </section>\n  );\n}\n`;

    const mapperSource = `import { stegaClean } from "@sanity/client/stega";\n\nimport type { ${componentName}Data } from "../../components/generated/${componentName}";\n\ntype UnknownRecord = Record<string, unknown> | null | undefined;\n\nconst asString = (value: unknown): string | undefined => {\n  if (typeof value !== "string") return undefined;\n  const cleaned = stegaClean(value).trim();\n  return cleaned || undefined;\n};\n\nconst asNumber = (value: unknown): number | undefined => {\n  if (typeof value === "number" && Number.isFinite(value)) return value;\n  if (typeof value === "string") {\n    const parsed = Number(stegaClean(value).trim());\n    return Number.isFinite(parsed) ? parsed : undefined;\n  }\n  return undefined;\n};\n\nconst asBoolean = (value: unknown): boolean | undefined =>\n  typeof value === "boolean" ? value : undefined;\n\nexport const map${componentName} = (input: UnknownRecord): Partial<${componentName}Data> => {\n  if (!input || typeof input !== "object") return {};\n\n  const source = input as Record<string, unknown>;\n\n  return {\n${fields
      .map((field) => {
        if (field.type === "number") {
          return `    ...(asNumber(source.${field.name}) !== undefined ? { ${field.name}: asNumber(source.${field.name}) } : {}),`;
        }
        if (field.type === "boolean") {
          return `    ...(asBoolean(source.${field.name}) !== undefined ? { ${field.name}: asBoolean(source.${field.name}) } : {}),`;
        }
        if (field.type === "array-string" || field.type === "portable-text") {
          return `    ...(Array.isArray(source.${field.name}) ? { ${field.name}: source.${field.name} as ${toTypeScriptType(field).replace(/;$/, "")} } : {}),`;
        }
        if (field.type === "array-reference") {
          return `    ...(Array.isArray(source.${field.name}) ? { ${field.name}: source.${field.name} as Array<{ _id?: string; _type?: string }> } : {}),`;
        }
        if (field.type === "reference") {
          return `    ...(source.${field.name} && typeof source.${field.name} === "object" ? { ${field.name}: source.${field.name} as { _id?: string; _type?: string } } : {}),`;
        }
        if (field.type === "image") {
          return `    ...(source.${field.name} && typeof source.${field.name} === "object" ? { ${field.name}: source.${field.name} as { asset?: { url?: string } } } : {}),`;
        }
        return `    ...(asString(source.${field.name}) ? { ${field.name}: asString(source.${field.name}) } : {}),`;
      })
      .join("\n")}\n  };\n};\n`;

    await writeFile(componentFilePath, componentSource, "utf8");
    await writeFile(mapperFilePath, mapperSource, "utf8");

    await ensureFileWithExports(
      path.join(generatedComponentsDir, "index.ts"),
      `export * from "./${componentName}";`,
    );
    await ensureFileWithExports(
      path.join(generatedSanityDir, "index.ts"),
      `export * from "./map${componentName}";`,
    );

    console.log("\n✅ Scaffold created and registered.");
    console.log(`- Schema: ${path.relative(repoRoot, schemaFilePath)}`);
    console.log(`- Query:  ${path.relative(repoRoot, queryFilePath)}`);
    console.log(`- Mapper: ${path.relative(repoRoot, mapperFilePath)}`);
    console.log(`- UI:     ${path.relative(repoRoot, componentFilePath)}`);
    console.log(
      "\nNext: import the generated query/mapper/component where you render this feature.",
    );
  } finally {
    rl.close();
  }
};

main().catch((error) => {
  console.error("\nFailed to scaffold Sanity component:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
