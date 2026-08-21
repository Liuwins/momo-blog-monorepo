import { IsInt, IsString, MaxLength, IsOptional, IsNotEmpty, MinLength, Min, Matches } from 'class-validator';
import { VISITOR_ID_PATTERN } from '../../common/validators/visitor-id';

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
  @Matches(VISITOR_ID_PATTERN, { message: '游客标识只能包含字母、数字、下划线或连字符' })
  visitorId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  replyToId?: number;

  @IsOptional()
  @IsString()
  replyToNickname?: string;
}
