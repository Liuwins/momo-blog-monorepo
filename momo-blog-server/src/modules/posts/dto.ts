import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

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

type SafeMediaReferenceOptions = { allowEmpty?: boolean };

/**
 * 媒体只允许同源根路径或 http(s) URL，禁止 javascript/data 协议、控制字符、
 * 路径穿越和逗号。逗号会破坏 TypeORM simple-array 的序列化边界。
 */
@ValidatorConstraint({ name: 'SafeMediaReference', async: false })
export class SafeMediaReferenceConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    if (typeof value !== 'string') return false;
    const options = (args.constraints[0] || {}) as SafeMediaReferenceOptions;
    if (!value) return options.allowEmpty === true;
    if (/[,\s\u0000-\u001f\u007f]/.test(value) || value.includes('\\')) return false;

    if (value.startsWith('/')) {
      return !value.startsWith('//') && !/(^|\/)\.\.(?:\/|$)/.test(value) && value !== '/';
    }

    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return '媒体地址必须是同源路径或 http(s) URL，不能包含危险协议、空白、逗号或路径穿越';
  }
}

/** simple-array 字段不能接受逗号，否则保存后会被拆成多个元素。 */
@ValidatorConstraint({ name: 'NoComma', async: false })
export class NoCommaConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && !value.includes(',');
  }

  defaultMessage() {
    return '该字段不能包含逗号';
  }
}

function safeMedia(options?: SafeMediaReferenceOptions, validationOptions?: ValidationOptions) {
  return Validate(SafeMediaReferenceConstraint, [options || {}], validationOptions);
}

function noComma(validationOptions?: ValidationOptions) {
  return Validate(NoCommaConstraint, [], validationOptions);
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
  @ArrayMaxSize(5, { message: '标签最多 5 个' })
  @ArrayUnique({ message: '标签不能重复' })
  @IsString({ each: true })
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
  @ArrayMaxSize(5, { message: '标签最多 5 个' })
  @ArrayUnique({ message: '标签不能重复' })
  @IsString({ each: true })
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
  tag?: string;
}
