import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

const SOURCE_URL = 'https://raw.githubusercontent.com/SkyCryptWebsite/SkyCrypt/development/src/constants/bestiary.js';

function literal(node: ts.Node): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    const result: Record<string, unknown> = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) throw new Error('Unsupported Bestiary property');
      const name = property.name;
      const key = ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
        ? name.text
        : null;
      if (!key) throw new Error('Unsupported Bestiary key');
      result[key] = literal(property.initializer);
    }
    return result;
  }
  throw new Error(`Unsupported Bestiary syntax: ${ts.SyntaxKind[node.kind]}`);
}

function exportedConstant(source: ts.SourceFile, name: string): unknown {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) {
        return literal(declaration.initializer);
      }
    }
  }
  throw new Error(`Missing ${name}`);
}

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Bestiary source request failed: ${response.status}`);
  const text = await response.text();
  const source = ts.createSourceFile('bestiary.js', text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
  const categories = exportedConstant(source, 'BESTIARY');
  const brackets = exportedConstant(source, 'BESTIARY_BRACKETS');
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: SOURCE_URL,
      license: 'MIT',
      extraction: 'Static TypeScript AST literal extraction; downloaded code is never executed.',
    },
    categories,
    brackets,
  };
  await writeFile(resolve('data/bestiary.generated.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log('Wrote Bestiary family and bracket metadata.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
