import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** 将资源路径参数限制为正整数，避免 NaN、浮点数和非正 ID 进入服务层。 */
@Injectable()
export class PositiveIntPipe implements PipeTransform<string | number, number> {
  transform(value: string | number, metadata: { data?: string }): number {
    const raw = String(value);
    if (!/^\d+$/.test(raw)) {
      throw new BadRequestException(`${metadata.data || 'id'} 必须是正整数`);
    }

    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${metadata.data || 'id'} 必须是正整数`);
    }
    return parsed;
  }
}
