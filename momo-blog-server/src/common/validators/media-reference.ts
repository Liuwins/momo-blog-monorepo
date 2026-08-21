import {
  Validate,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export type SafeMediaReferenceOptions = { allowEmpty?: boolean };

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

export function safeMedia(options?: SafeMediaReferenceOptions, validationOptions?: ValidationOptions) {
  return Validate(SafeMediaReferenceConstraint, [options || {}], validationOptions);
}

export function noComma(validationOptions?: ValidationOptions) {
  return Validate(NoCommaConstraint, [], validationOptions);
}
