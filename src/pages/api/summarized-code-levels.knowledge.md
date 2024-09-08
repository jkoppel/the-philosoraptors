# summarized-code-levels.ts Knowledge

## Template String Escaping

When using template strings in prompt templates for LLM calls, be sure to escape any `${}` syntax that is not intended to be interpreted as a template literal. This can be done by using the backslash character:

```javascript
const prompt = `
  ... your prompt text ...
  $\{variableName\}
`;
```

This prevents errors like "Single '}' in template" when parsing the prompt template.

