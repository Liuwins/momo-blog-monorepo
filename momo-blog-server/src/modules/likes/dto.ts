import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { VISITOR_ID_PATTERN } from '../../common/validators/visitor-id';

export class LikeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(VISITOR_ID_PATTERN, { message: '游客标识只能包含字母、数字、下划线或连字符' })
  visitorId?: string;
}
