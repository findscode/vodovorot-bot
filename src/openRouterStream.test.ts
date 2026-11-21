import { describe, expect, it } from 'vitest';
import { createSseAccumulator } from './openRouterStream.js';

const line = (obj: unknown): string => `data: ${JSON.stringify(obj)}\n\n`;

describe('createSseAccumulator', () => {
  it('accumulates content across arbitrary chunk boundaries', () => {
    const acc = createSseAccumulator();
    const full =
      line({ choices: [{ delta: { content: 'При' } }] }) +
      line({ choices: [{ delta: { content: 'вет' }, finish_reason: 'stop' }] }) +
      'data: [DONE]\n\n';
    let grew = false;
    for (let i = 0; i < full.length; i += 7) {
      grew = acc.push(full.slice(i, i + 7)) || grew;
    }
    acc.flush();
    expect(grew).toBe(true);
    expect(acc.state.content).toBe('Привет');
    expect(acc.state.finishReason).toBe('stop');
    expect(acc.state.error).toBeNull();
  });

  it('keeps reasoning separate from content', () => {
    const acc = createSseAccumulator();
    const grew = acc.push(
      line({
        choices: [
          {
            delta: {
              reasoning: 'думаю ',
              reasoning_details: [{ type: 'reasoning.text', text: 'ещё' }],
            },
          },
        ],
      }),
    );
    expect(grew).toBe(false);
    expect(acc.state.content).toBe('');
    expect(acc.state.reasoning).toBe('думаю ещё');
  });

  it('records an error from the stream', () => {
    const acc = createSseAccumulator();
    acc.push(line({ error: { message: 'upstream down' } }));
    expect(acc.state.error).toBe('upstream down');
  });

  it('ignores comments and broken JSON', () => {
    const acc = createSseAccumulator();
    acc.push(': OPENROUTER PROCESSING\n\ndata: {oops\n\n');
    acc.flush();
    expect(acc.state.content).toBe('');
  });

  it('parses a last line without trailing newline on flush', () => {
    const acc = createSseAccumulator();
    acc.push(`data: ${JSON.stringify({ choices: [{ delta: { content: 'x' } }] })}`);
    expect(acc.state.content).toBe('');
    expect(acc.flush()).toBe(true);
    expect(acc.state.content).toBe('x');
  });
});
