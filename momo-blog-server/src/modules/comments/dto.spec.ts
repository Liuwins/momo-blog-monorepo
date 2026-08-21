import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateCommentDto } from './dto';

describe('CreateCommentDto', () => {
  it('拒绝非正数的动态和回复 ID', async () => {
    const dto = new CreateCommentDto();
    dto.postId = 0;
    dto.content = '评论';
    dto.replyToId = -1;

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'postId')).toBe(true);
    expect(errors.some((error) => error.property === 'replyToId')).toBe(true);
  });

  it('接受带正数回复 ID 的评论', async () => {
    const dto = new CreateCommentDto();
    dto.postId = 1;
    dto.content = '评论';
    dto.replyToId = 2;

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('拒绝包含控制字符的游客标识', async () => {
    const dto = new CreateCommentDto();
    dto.postId = 1;
    dto.content = '评论';
    dto.visitorId = 'visitor id';

    expect((await validate(dto)).some((error) => error.property === 'visitorId')).toBe(true);
  });
});
