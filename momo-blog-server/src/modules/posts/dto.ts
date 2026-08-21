import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { noComma, safeMedia } from '../../common/validators/media-reference';

@ValidatorConstraint({ name: 'NotEmptyPost', async: false })
export class NotEmptyPostConstraint implements ValidatorConstraintInterface {
  validate(_value: any, args: ValidationArguments) {
    const obj = args.object as CreatePostDto;
    const content = (obj.content || '').trim();
    const images = obj.images || [];
    const videos = obj.videos || [];
    return content.length > 0 || images.length > 0 || videos.length > 0;
  }
  defaultMessage() {
    return '文章内容、图片或视频至少填写一个';
  }
}

function trimTags(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;
}

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9, { message: '图片最多 9 张' })
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @safeMedia(undefined, { each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9, { message: '视频最多 9 个' })
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @safeMedia(undefined, { each: true })
  videos?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @safeMedia({ allowEmpty: true })
  music?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => trimTags(value))
  @ArrayMaxSize(5, { message: '标签最多 5 个' })
  @ArrayUnique({ message: '标签不能重复' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: '标签不能为空' })
  @MaxLength(50, { each: true })
  @noComma({ each: true })
  tags?: string[];

  @Validate(NotEmptyPostConstraint)
  notEmpty: boolean = true;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9, { message: '图片最多 9 张' })
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @safeMedia(undefined, { each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9, { message: '视频最多 9 个' })
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @safeMedia(undefined, { each: true })
  videos?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @safeMedia({ allowEmpty: true })
  music?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => trimTags(value))
  @ArrayMaxSize(5, { message: '标签最多 5 个' })
  @ArrayUnique({ message: '标签不能重复' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: '标签不能为空' })
  @MaxLength(50, { each: true })
  @noComma({ each: true })
  tags?: string[];
}

export class QueryPostsDto extends PaginationQueryDto {

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsIn(['latest', 'hot'])
  sortBy?: 'latest' | 'hot';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @noComma()
  tag?: string;
}
