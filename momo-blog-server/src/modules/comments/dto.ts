import { IsInt, IsString, MaxLength, IsOptional, IsNotEmpty, MinLength, Min } from 'class-validator';

export class CreateCommentDto {
  @IsInt()
  @Min(1)
  postId: number;

  @IsNotEmpty({ message: '评论内容不能为空' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  replyToId?: number;

  @IsOptional()
  @IsString()
  replyToNickname?: string;
}
