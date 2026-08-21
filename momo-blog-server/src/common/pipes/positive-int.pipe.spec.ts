import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PositiveIntPipe } from './positive-int.pipe';

describe('PositiveIntPipe', () => {
  const pipe = new PositiveIntPipe();

  it('将合法路径参数转换为正整数', () => {
    expect(pipe.transform('42', { data: 'postId' })).toBe(42);
    expect(pipe.transform(7, { data: 'postId' })).toBe(7);
  });

  it.each(['', '0', '-1', '1.5', '1abc', '9007199254740992'])('拒绝非法 ID：%s', (value) => {
    expect(() => pipe.transform(value, { data: 'postId' })).toThrow(BadRequestException);
  });
});
