import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class ReorderRoomsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIds!: string[];
}
