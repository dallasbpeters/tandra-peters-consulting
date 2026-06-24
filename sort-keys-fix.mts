#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Sorts object literal keys alphabetically.
 * Collects all transforms, then applies them right-to-left so offsets stay valid.
 */
import ts from "typescript";

const files = process.argv.slice(2);
if (!files.length) {
  process.exit(0);
}

interface Transform {
  end: number;
  fullStart: number;
  newText: string;
}

function sortFile(file: string) {
  const original = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    original,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX
  );

  const transforms: Transform[] = [];

  function visit(node: ts.Node) {
    ts.forEachChild(node, visit); // children first → bottom-up

    if (!ts.isObjectLiteralExpression(node) || node.properties.length < 2) {
      return;
    }

    const props = node.properties;
    const sortable = props.every(
      (p) =>
        (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
        !ts.isComputedPropertyName(p.name) &&
        (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
    );
    if (!sortable) {
      return;
    }

    const keys = props.map((p) =>
      ts.isIdentifier(p.name) ? p.name.text : (p.name as ts.StringLiteral).text
    );
    const sortedKeys = [...keys].sort((a, b) => a.localeCompare(b));
    if (keys.join("\0") === sortedKeys.join("\0")) {
      return;
    }

    const nodeFullStart = node.getFullStart();
    const nodeEnd = node.getEnd();

    const slots: string[] = [];
    const propTexts: string[] = [];
    const seps: string[] = [];

    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      slots.push(original.slice(p.getFullStart(), p.getStart(sourceFile)));
      propTexts.push(original.slice(p.getStart(sourceFile), p.getEnd()));
      const nextStart =
        i + 1 < props.length ? props[i + 1].getFullStart() : nodeEnd - 1;
      seps.push(original.slice(p.getEnd(), nextStart));
    }

    const order = sortedKeys.map((k) => keys.indexOf(k));
    const leadingTrivia = original.slice(
      nodeFullStart,
      node.getStart(sourceFile)
    );

    let inner = "";
    for (let i = 0; i < order.length; i++) {
      inner += slots[order[i]] + propTexts[order[i]] + seps[i];
    }

    transforms.push({
      fullStart: nodeFullStart,
      end: nodeEnd,
      newText:
        leadingTrivia +
        original[node.getStart(sourceFile)] +
        inner +
        original[nodeEnd - 1],
    });
  }

  visit(sourceFile);

  if (!transforms.length) {
    return;
  }

  // Apply right-to-left so earlier positions stay valid
  transforms.sort((a, b) => b.fullStart - a.fullStart);
  let result = original;
  for (const { fullStart, end, newText } of transforms) {
    result = result.slice(0, fullStart) + newText + result.slice(end);
  }

  if (result !== original) {
    writeFileSync(file, result, "utf8");
    console.log(`Fixed: ${file}`);
  }
}

for (const file of files) {
  try {
    sortFile(file);
  } catch (err) {
    console.error(`Error in ${file}:`, err);
  }
}
