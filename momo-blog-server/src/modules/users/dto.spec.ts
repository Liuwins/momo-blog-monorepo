import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateProfileDto } from './dto';

describe('UpdateProfileDto', () => {
  it('允许清空或设置同源媒体路径', async () => {
    const dto = new UpdateProfileDto();
    dto.avatar = '/images/avatar.webp';
    dto.bgImage = '';
    dto.bgVideo = '/images/cover.mp4';
    dto.bgMusic = 'https://cdn.example.com/ambient.mp3';

    expect(await validate(dto)).toHaveLength(0);
  });

  it('拒绝危险协议的头像、封面、封面视频和背景音乐', async () => {
    const dto = new UpdateProfileDto();
    dto.avatar = 'data:image/svg+xml,<svg></svg>';
    dto.bgImage = 'javascript:alert(1)';
    dto.bgVideo = 'data:video/mp4;base64,AAAA';
    dto.bgMusic = '//evil.example.com/music.mp3';

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['avatar', 'bgImage', 'bgVideo', 'bgMusic']),
    );
  });
});
