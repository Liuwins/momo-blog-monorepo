import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreatePostDto } from './dto';

describe('CreatePostDto', () => {
  it('拒绝空动态和超出数量限制的标签', async () => {
    const empty = new CreatePostDto();
    const emptyErrors = await validate(empty);
    expect(emptyErrors.length).toBeGreaterThan(0);

    const tooManyTags = new CreatePostDto();
    tooManyTags.content = '内容';
    tooManyTags.tags = ['1', '2', '3', '4', '5', '6'];
    const tagErrors = await validate(tooManyTags);
    expect(tagErrors.some((error) => error.property === 'tags')).toBe(true);
  });

  it('允许带配乐的纯文本动态', async () => {
    const dto = new CreatePostDto();
    dto.content = '一段内容';
    dto.music = '/images/music/song.mp3';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
