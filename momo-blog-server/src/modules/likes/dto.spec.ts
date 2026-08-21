import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { LikeQueryDto } from './dto';

describe('LikeQueryDto', () => {
  it('允许正常游客标识', async () => {
    const dto = new LikeQueryDto();
    dto.visitorId = 'v_abc-123';
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('拒绝超长或含空白的游客标识', async () => {
    const longId = new LikeQueryDto();
    longId.visitorId = 'a'.repeat(65);
    expect((await validate(longId)).some((error) => error.property === 'visitorId')).toBe(true);

    const spaced = new LikeQueryDto();
    spaced.visitorId = 'visitor id';
    expect((await validate(spaced)).some((error) => error.property === 'visitorId')).toBe(true);
  });
});
