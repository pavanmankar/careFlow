import { clipIp, clipUserAgent } from './request-meta';

describe('clipRequestMeta', () => {
  it('truncates IP to 64 characters', () => {
    expect(clipIp('a'.repeat(80))).toHaveLength(64);
  });

  it('truncates user-agent to 512 characters', () => {
    expect(clipUserAgent(`Mozilla/5.0 ${'x'.repeat(600)}`)).toHaveLength(512);
  });

  it('joins array header values before clipping', () => {
    expect(clipUserAgent(['one', 'two'])).toBe('one, two');
  });
});
