import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import { parseStringPromise } from 'xml2js';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';
import { find, min } from 'lodash';
import { DateTime } from 'luxon';

export class RuElectronicsParser extends ScheduleParser {
    protected supplierAlias = 'ruelectronics';
    protected currencyAlfa3 = 'RUB';
    async parse(): Promise<void> {
        const url = this.schedule.getConfigService().get<string>('API_RUELECTRONICS_URL');
        const res = await this.schedule.getHttp().get(url);
        const { data } = await firstValueFrom(res);
        const { product } = await parseStringPromise(data, {
            explicitRoot: false,
            explicitArray: false,
            mergeAttrs: true,
        });
        const promises = product.map((good) => {
            const body = find(good.techinfo?.parameter, { name: 'Корпус' });
            const packageQuantity = good.quant_industry
                ? parseInt(good.quant_industry)
                : find(good.techinfo?.parameter, { name: 'Упаковка' })?.value.replace(/[^0-9]/g, '') || 0;
            const multiple = good.packets ? parseInt(min(good.packets.norma)) || 1 : packageQuantity || 1;
            const prices = [
                {
                    value: parseFloat(good.price),
                    min: multiple,
                    max: multiple * 3 - 1,
                    currency: this.currency.id,
                    isOrdinary: true,
                },
                {
                    value: parseFloat(good.optprice),
                    min: multiple * 3,
                    max: 0,
                    currency: this.currency.id,
                    isOrdinary: true,
                },
                {
                    value: parseFloat(good.vipprice),
                    min: multiple,
                    max: 0,
                    currency: this.currency.id,
                    isOrdinary: false,
                },
            ];
            return this.schedule.getGoods().createOrUpdate(
                new GoodDto({
                    alias: good.product_name,
                    code: good.article,
                    supplier: this.supplier.id,
                    source: Source.Db,
                    updatedAt: new Date(),
                    parameters: [
                        { name: 'name', stringValue: good.product_name },
                        ...(good.brand ? [{ name: 'producer', stringValue: good.brand }] : []),
                        ...(packageQuantity ? [{ name: 'packageQuantity', numericValue: packageQuantity }] : []),
                        ...(body ? [{ name: 'case', stringValue: body.value }] : []),
                    ],
                    warehouses: [
                        ...(good.quant
                            ? [
                                  {
                                      name: 'CENTER',
                                      deliveryTime: this.supplier.deliveryTime,
                                      quantity: parseInt(good.quant),
                                      multiple,
                                      prices,
                                      options: {
                                          location_id: 'ОДИНЦОВО',
                                      },
                                  },
                              ]
                            : []),
                        ...(good.quant_arrived
                            ? [
                                  {
                                      name: 'ARRIVED',
                                      deliveryTime: this.supplier.deliveryTime + 2,
                                      quantity: parseInt(good.quant_arrived),
                                      multiple,
                                      prices,
                                      options: {
                                          location_id: 'НА ПРИЕМКЕ',
                                      },
                                  },
                              ]
                            : []),
                        ...(good.quant_arrives
                            ? [
                                  {
                                      name: 'TRANSIT',
                                      deliveryTime:
                                          this.supplier.deliveryTime +
                                          Math.round(
                                              DateTime.fromFormat(good.date_arrives, 'yyyyLLdd').diff(
                                                  DateTime.now(),
                                                  'days',
                                              ).days,
                                          ),
                                      quantity: parseInt(good.quant_arrives),
                                      multiple,
                                      prices,
                                      options: {
                                          location_id: 'ЕДЕТЪ',
                                      },
                                  },
                              ]
                            : []),
                        ...(good.quant_industry
                            ? [
                                  {
                                      name: 'PRODUCED',
                                      deliveryTime: this.supplier.deliveryTime + 100,
                                      quantity: parseInt(good.quant_industry),
                                      multiple,
                                      prices,
                                      options: {
                                          location_id: 'В ПРОИЗВОДСТВЕ',
                                      },
                                  },
                              ]
                            : []),
                    ],
                }),
            );
        });
        await Promise.all(promises);
    }
}
