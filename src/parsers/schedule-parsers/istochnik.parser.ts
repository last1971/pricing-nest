import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';

export class IstochnikParser extends ScheduleParser {
    protected supplierAlias = 'istochnik';
    protected currencyAlfa3 = 'RUB';
    async parse(): Promise<void> {
        const url = this.schedule.getConfigService().get<string>('API_ISTOCHNIK_URL');
        const api_key = this.schedule.getConfigService().get<string>('API_ISTOCHNIK_KEY');
        const res = await this.schedule.getHttp().get(url, { params: { api_key } });
        const { data } = await firstValueFrom(res);
        const promises = data.PriceList.Items.Item.map((item: any) => {
            return this.schedule.getGoods().createOrUpdate(
                new GoodDto({
                    alias: item.productName,
                    code: item.istCode,
                    supplier: this.supplier.id,
                    source: Source.Db,
                    updatedAt: new Date(),
                    parameters: [
                        { name: 'name', stringValue: item.productName },
                        ...(item.manufacturer ? [{ name: 'producer', stringValue: item.manufacturer }] : []),
                        ...(item.retailPack ? [{ name: 'packageQuantity', numericValue: item.retailPack }] : []),
                        ...(item.packLine ? [{ name: 'remark', stringValue: item.packLine }] : []),
                    ],
                    warehouses: [
                        {
                            name: 'CENTER',
                            deliveryTime: this.supplier.deliveryTime,
                            quantity: parseInt(item.stock),
                            multiple: item.minSalePack,
                            prices: [
                                {
                                    value: item.salePrice,
                                    min: item.minSalePack,
                                    max: 0,
                                    isOrdinary: false,
                                    currency: this.currency.id,
                                },
                            ],
                        },
                    ],
                }),
            );
        });
        await Promise.all(promises);
    }
}
