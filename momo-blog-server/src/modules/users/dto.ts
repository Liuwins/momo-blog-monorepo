import { IsOptional, IsString, MaxLength, Validate } from 'class-validator';
import { SafeMediaReferenceConstraint } from '../posts/dto';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Validate(SafeMediaReferenceConstraint, [{ allowEmpty: true }])
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  signature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Validate(SafeMediaReferenceConstraint, [{ allowEmpty: true }])
  bgImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Validate(SafeMediaReferenceConstraint, [{ allowEmpty: true }])
  bgMusic?: string;
}
