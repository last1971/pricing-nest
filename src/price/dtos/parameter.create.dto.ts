import { Types } from 'mongoose';

export class ParameterCreateDto {
    name: string;
    stringValue: string;
    numericValue: number;
    unit?: Types.ObjectId;
}
