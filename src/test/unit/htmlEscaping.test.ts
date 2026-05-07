import { describe, expect, it } from 'vitest';
import { toScriptStringLiteral } from '../../preview/htmlEscaping';

describe('htmlEscaping', () => {
  it('round-trips script string literals with quotes and spaces', () => {
    const value = "vscode-webview-resource://paper's final.pdf";
    const literal = toScriptStringLiteral(value);

    expect(JSON.parse(literal)).toBe(value);
  });

  it('escapes script-breaking HTML characters', () => {
    const value = 'vscode-webview-resource://x</script><img src=x>&';
    const literal = toScriptStringLiteral(value);

    expect(JSON.parse(literal)).toBe(value);
    expect(literal).not.toContain('</script>');
    expect(literal).not.toContain('<img');
    expect(literal).not.toContain('>&');
  });
});
