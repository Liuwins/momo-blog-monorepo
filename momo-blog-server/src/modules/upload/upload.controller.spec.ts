import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { HttpException } from '@nestjs/common';
import { UploadController } from './upload.controller';

describe('UploadController', () => {
  let uploadDir: string;
  let controller: UploadController;

  beforeEach(() => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'momoblog-upload-'));
    process.env.UPLOAD_DIR = uploadDir;
    controller = new UploadController();
  });

  afterEach(() => {
    delete process.env.UPLOAD_DIR;
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  it('拒绝缺失文件和不支持的媒体类型', async () => {
    await expect(controller.uploadVideo(undefined as any)).rejects.toMatchObject({
      status: 400,
      message: '没有收到视频文件',
    });
    await expect(controller.uploadAudio({
      mimetype: 'application/octet-stream',
      originalname: 'payload.bin',
      buffer: Buffer.from('payload'),
      size: 7,
    } as any)).rejects.toBeInstanceOf(HttpException);
  });

  it('拒绝 MIME 声明正确但文件头不匹配的媒体', async () => {
    await expect(controller.upload([{
      mimetype: 'image/png',
      originalname: 'fake.png',
      buffer: Buffer.from('not-a-png'),
      size: 9,
    }] as any)).rejects.toMatchObject({ status: 400 });

    await expect(controller.uploadVideo({
      mimetype: 'video/mp4',
      originalname: 'fake.mp4',
      buffer: Buffer.from('not-an-mp4'),
      size: 10,
    } as any)).rejects.toMatchObject({ status: 400 });
  });

  it('保存视频并限制音频文件名中的危险字符', async () => {
    const mp4Header = Buffer.from('000000186674797069736f6d0000020069736f6d69736f32', 'hex');
    const mp3Header = Buffer.from('49443304000000000000', 'hex');
    const video = await controller.uploadVideo({
      mimetype: 'video/mp4',
      originalname: 'clip.mp4',
      buffer: mp4Header,
      size: mp4Header.length,
    } as any);
    expect(video.url).toMatch(/^\/images\/[a-f0-9]{16}\/video\.mp4$/);

    const audio = await controller.uploadAudio({
      mimetype: 'audio/mpeg',
      originalname: '../晚间:*?\u0000散步.mp3',
      buffer: mp3Header,
      size: mp3Header.length,
    } as any);
    expect(audio.name).not.toMatch(/[/:*?]/);
    expect(audio.url).toMatch(/^\/images\/[a-f0-9]{16}\/.*\.mp3$/);
    expect(fs.readdirSync(uploadDir)).toHaveLength(2);
  });
});
