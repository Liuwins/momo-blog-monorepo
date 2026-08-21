import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import { CreatePostDto, QueryPostsDto } from './dto';

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

  it('只允许安全的媒体 URL 或同源路径', async () => {
    const dto = new CreatePostDto();
    dto.content = '内容';
    dto.images = ['/images/photo.webp', 'https://cdn.example.com/photo.webp'];
    dto.videos = ['javascript:alert(1)'];
    dto.music = '';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'videos')).toBe(true);
    expect(errors.some((error) => error.property === 'music')).toBe(false);
  });

  it('拒绝会破坏 simple-array 序列化的逗号和路径穿越', async () => {
    const dto = new CreatePostDto();
    dto.content = '内容';
    dto.images = ['/images/../secret.webp'];
    dto.tags = ['生活,隐私'];

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'images')).toBe(true);
    expect(errors.some((error) => error.property === 'tags')).toBe(true);
  });

  it('规范化标签查询并拒绝逗号分隔符', async () => {
    const dto = plainToInstance(QueryPostsDto, { tag: ' 生活 ' });
    expect((await validate(dto))).toHaveLength(0);
    expect(dto.tag).toBe('生活');

    const invalid = plainToInstance(QueryPostsDto, { tag: '生活,隐私' });
    expect((await validate(invalid)).some((error) => error.property === 'tag')).toBe(true);
  });

  it('写入动态前去除标签空格并拒绝空标签', async () => {
    const dto = plainToInstance(CreatePostDto, {
      content: '内容',
      tags: [' 生活 ', ''],
    });

    expect(dto.tags).toEqual(['生活', '']);
    expect((await validate(dto)).some((error) => error.property === 'tags')).toBe(true);
  });
});
