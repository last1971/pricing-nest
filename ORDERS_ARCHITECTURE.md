# Архитектура системы заказов

## Обзор

Система заказов для работы с разными API поставщиков, построенная на базе существующих паттернов проекта (AbstractParser, Strategy Pattern).

**Ключевые особенности:**
- Разные поставщики поддерживают разные операции
- Гибкая система статусов (у каждого поставщика свои)
- Резервирование товаров (где поддерживается API)
- Заказы по кодам поставщиков (опциональная привязка к Good)
- Для поставщиков без API - только хранение в БД и экспорт в XLSX

## 1. Структура модуля

```
src/order/
├── schemas/
│   ├── order.schema.ts              # Основная схема заказа
│   ├── order-item.schema.ts         # Строка заказа
│   └── order-status-history.schema.ts # История смены статусов
├── dtos/
│   ├── order.dto.ts
│   ├── order-item.dto.ts
│   ├── create-order.dto.ts
│   ├── update-order-item.dto.ts
│   ├── reserve-item.dto.ts
│   └── order-filter.dto.ts
├── integrations/
│   ├── interfaces/
│   │   └── order-integration.interface.ts  # Интерфейс всех операций
│   ├── abstract.order.integration.ts       # Базовый класс
│   ├── compel.order.integration.ts
│   ├── promelec.order.integration.ts
│   └── db-only.order.integration.ts
├── order.service.ts                # Главный сервис
├── order.controller.ts             # REST API
├── order.processor.ts              # Bull queue обработка
├── order.export.service.ts         # XLSX экспорт
└── order.module.ts
```

## 2. Схемы БД

### Order Schema

```typescript
@Schema({ timestamps: true })
export class Order {
    @Prop({ required: true })
    orderNumber: string;  // Внутренний номер (COMPEL-20251102-0001)

    @Prop({ type: Types.ObjectId, required: true, ref: 'Supplier' })
    supplier: Supplier;

    @Prop({ required: true })
    supplierAlias: string;  // Для быстрого доступа

    @Prop({ required: false })
    supplierOrderNumber?: string;  // Номер заказа у поставщика

    @Prop({ required: true })
    status: string;  // Гибкий статус (у каждого поставщика свой)

    @Prop({ required: false })
    userId?: string;  // Кто создал (из внешней системы)

    @Prop({ required: false })
    comment?: string;

    @Prop({ required: false })
    shippingMethod?: string;  // Способ отгрузки (если есть)

    @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
    shippingAddress?: any;  // Адрес доставки

    @Prop({ required: false })
    totalAmount?: number;  // Общая сумма

    @Prop({ type: Types.ObjectId, ref: 'Currency' })
    currency?: Currency;

    @Prop({ required: false })
    invoiceNumber?: string;  // Номер счета

    @Prop({ required: false })
    invoiceDate?: Date;

    @Prop({ required: false })
    shipmentDate?: Date;  // Дата отгрузки

    @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
    options?: any;  // Специфичные данные поставщика

    @Prop({ type: [OrderStatusHistorySchema] })
    statusHistory: OrderStatusHistory[];

    @Prop({ default: false })
    isApiManaged: boolean;  // Управляется через API поставщика
}

OrderSchema.index({ supplierAlias: 1, orderNumber: 1 });
OrderSchema.index({ supplierOrderNumber: 1, supplierAlias: 1 });
OrderSchema.index({ status: 1, supplier: 1 });
```

### OrderItem Schema

```typescript
@Schema({ timestamps: true })
export class OrderItem {
    @Prop({ type: Types.ObjectId, required: true, ref: 'Order' })
    order: Order;

    @Prop({ required: true })
    lineNumber: number;  // Порядковый номер строки

    @Prop({ required: false })
    supplierLineId?: string;  // ID строки у поставщика (для API)

    @Prop({ required: true })
    supplierCode: string;  // Код товара у поставщика

    @Prop({ type: Types.ObjectId, ref: 'Good', required: false })
    good?: Good;  // Опциональная привязка к нашему товару

    @Prop({ required: true })
    productName: string;

    @Prop({ required: false })
    manufacturer?: string;

    @Prop({ required: false })
    packageType?: string;

    @Prop({ required: true })
    quantity: number;

    @Prop({ required: false })
    reservedQuantity?: number;  // Зарезервировано

    @Prop({ required: false })
    shippedQuantity?: number;  // Отгружено

    @Prop({ required: true })
    price: number;  // Цена на момент заказа

    @Prop({ type: Types.ObjectId, required: true, ref: 'Currency' })
    currency: Currency;

    @Prop({ required: false })
    warehouseName?: string;

    @Prop({ required: false })
    deliveryTime?: number;  // Срок поставки в днях

    @Prop({ required: false })
    status?: string;  // Статус строки (если поддерживается)

    @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
    options?: any;  // Доп. данные от API поставщика
}

OrderItemSchema.index({ order: 1, lineNumber: 1 }, { unique: true });
OrderItemSchema.index({ supplierLineId: 1 });
```

### OrderStatusHistory Schema

```typescript
@Schema()
export class OrderStatusHistory {
    @Prop({ required: true })
    status: string;

    @Prop({ required: true, default: Date.now })
    timestamp: Date;

    @Prop({ required: false })
    userId?: string;

    @Prop({ required: false })
    comment?: string;

    @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
    metadata?: any;  // Доп. данные от API
}
```

## 3. Интерфейс интеграций

### OrderOperation Enum

```typescript
export enum OrderOperation {
    LIST_ORDERS = 'list_orders',
    GET_ORDER_ITEMS = 'get_order_items',
    ADD_ITEM = 'add_item',
    UPDATE_ITEM = 'update_item',
    DELETE_ITEM = 'delete_item',
    RESERVE_ITEM = 'reserve_item',
    GET_SHIPPING_METHODS = 'get_shipping_methods',
    CREATE_INVOICE = 'create_invoice',
    SHIP_ORDER = 'ship_order',
    GET_ORDER_STATUS = 'get_order_status',
    CREATE_ORDER = 'create_order',
}
```

### IOrderIntegration Interface

```typescript
export interface IOrderIntegration {
    // Метаданные
    getAlias(): string;
    getSupportedOperations(): OrderOperation[];
    isOperationSupported(operation: OrderOperation): boolean;

    // Основные операции
    listOrders(filter: OrderFilterDto): Promise<OrderDto[]>;
    getOrderItems(orderId: string): Promise<OrderItemDto[]>;
    createOrder(order: CreateOrderDto): Promise<OrderDto>;
    addItem(orderId: string, item: OrderItemDto): Promise<OrderItemDto>;
    updateItem(orderId: string, itemId: string, updates: UpdateOrderItemDto): Promise<OrderItemDto>;
    deleteItem(orderId: string, itemId: string): Promise<void>;

    // Резервирование
    reserveItem(orderId: string, itemId: string, quantity: number): Promise<ReserveItemDto>;

    // Отгрузка
    getShippingMethods(): Promise<ShippingMethodDto[]>;
    createInvoice(orderId: string): Promise<InvoiceDto>;
    shipOrder(orderId: string, shippingMethodId?: string): Promise<ShipmentDto>;

    // Статус
    getOrderStatus(orderId: string): Promise<OrderStatusDto>;
}
```

## 4. Абстрактный класс

### AbstractOrderIntegration

```typescript
export abstract class AbstractOrderIntegration implements IOrderIntegration {
    constructor(
        protected readonly httpService: HttpService,
        protected readonly vaultService: VaultService,
        protected readonly logger: Logger,
        protected readonly cache: Cache,
    ) {}

    abstract getAlias(): string;
    abstract getSupportedOperations(): OrderOperation[];

    isOperationSupported(operation: OrderOperation): boolean {
        return this.getSupportedOperations().includes(operation);
    }

    protected throwIfNotSupported(operation: OrderOperation): void {
        if (!this.isOperationSupported(operation)) {
            throw new BadRequestException(
                `Operation ${operation} is not supported by ${this.getAlias()}`
            );
        }
    }

    // Методы по умолчанию выбрасывают исключения
    async listOrders(filter: OrderFilterDto): Promise<OrderDto[]> {
        this.throwIfNotSupported(OrderOperation.LIST_ORDERS);
        throw new NotImplementedException();
    }

    async getOrderItems(orderId: string): Promise<OrderItemDto[]> {
        this.throwIfNotSupported(OrderOperation.GET_ORDER_ITEMS);
        throw new NotImplementedException();
    }

    async createOrder(order: CreateOrderDto): Promise<OrderDto> {
        this.throwIfNotSupported(OrderOperation.CREATE_ORDER);
        throw new NotImplementedException();
    }

    async addItem(orderId: string, item: OrderItemDto): Promise<OrderItemDto> {
        this.throwIfNotSupported(OrderOperation.ADD_ITEM);
        throw new NotImplementedException();
    }

    async updateItem(orderId: string, itemId: string, updates: UpdateOrderItemDto): Promise<OrderItemDto> {
        this.throwIfNotSupported(OrderOperation.UPDATE_ITEM);
        throw new NotImplementedException();
    }

    async deleteItem(orderId: string, itemId: string): Promise<void> {
        this.throwIfNotSupported(OrderOperation.DELETE_ITEM);
        throw new NotImplementedException();
    }

    async reserveItem(orderId: string, itemId: string, quantity: number): Promise<ReserveItemDto> {
        this.throwIfNotSupported(OrderOperation.RESERVE_ITEM);
        throw new NotImplementedException();
    }

    async getShippingMethods(): Promise<ShippingMethodDto[]> {
        this.throwIfNotSupported(OrderOperation.GET_SHIPPING_METHODS);
        throw new NotImplementedException();
    }

    async createInvoice(orderId: string): Promise<InvoiceDto> {
        this.throwIfNotSupported(OrderOperation.CREATE_INVOICE);
        throw new NotImplementedException();
    }

    async shipOrder(orderId: string, shippingMethodId?: string): Promise<ShipmentDto> {
        this.throwIfNotSupported(OrderOperation.SHIP_ORDER);
        throw new NotImplementedException();
    }

    async getOrderStatus(orderId: string): Promise<OrderStatusDto> {
        this.throwIfNotSupported(OrderOperation.GET_ORDER_STATUS);
        throw new NotImplementedException();
    }

    // Утилиты (как в AbstractParser)
    protected async getFromCache<T>(key: string): Promise<T | null> {
        return this.cache.get<T>(key);
    }

    protected async saveToCache<T>(key: string, value: T, ttl?: number): Promise<void> {
        await this.cache.set(key, value, ttl);
    }

    protected async handleApiError(error: any, operation: string): Promise<void> {
        this.logger.error(
            `[${this.getAlias()}] Order API error in ${operation}: ${error.message}`,
            error.stack
        );
    }
}
```

## 5. Примеры интеграций

### CompelOrderIntegration

```typescript
export class CompelOrderIntegration extends AbstractOrderIntegration {
    getAlias(): string {
        return 'compel';
    }

    getSupportedOperations(): OrderOperation[] {
        return [
            OrderOperation.LIST_ORDERS,
            OrderOperation.GET_ORDER_ITEMS,
            OrderOperation.ADD_ITEM,
            OrderOperation.UPDATE_ITEM,
            OrderOperation.DELETE_ITEM,
            OrderOperation.RESERVE_ITEM,
            OrderOperation.GET_SHIPPING_METHODS,
            OrderOperation.CREATE_INVOICE,
            OrderOperation.SHIP_ORDER,
        ];
    }

    async listOrders(filter: OrderFilterDto): Promise<OrderDto[]> {
        const compel = await this.vaultService.get('compel');

        const response = await firstValueFrom(
            this.httpService.post(compel.ORDER_API_URL, {
                method: 'get_orders',
                params: {
                    user_hash: compel.HASH,
                    ...this.mapFilterToCompelFormat(filter),
                },
            })
        );

        return this.parseCompelOrders(response.data);
    }

    async addItem(orderId: string, item: OrderItemDto): Promise<OrderItemDto> {
        const compel = await this.vaultService.get('compel');

        const response = await firstValueFrom(
            this.httpService.post(compel.ORDER_API_URL, {
                method: 'add_order_line',
                params: {
                    user_hash: compel.HASH,
                    order_id: orderId,
                    item_code: item.supplierCode,
                    quantity: item.quantity,
                },
            })
        );

        return this.parseCompelOrderItem(response.data);
    }

    async reserveItem(orderId: string, itemId: string, quantity: number): Promise<ReserveItemDto> {
        const compel = await this.vaultService.get('compel');

        const response = await firstValueFrom(
            this.httpService.post(compel.ORDER_API_URL, {
                method: 'reserve_item',
                params: {
                    user_hash: compel.HASH,
                    order_id: orderId,
                    line_id: itemId,
                    quantity: quantity,
                },
            })
        );

        return {
            reserved: response.data.reserved,
            expiresAt: new Date(response.data.expires_at),
            reservationId: response.data.reservation_id,
        };
    }

    private mapFilterToCompelFormat(filter: OrderFilterDto): any {
        // Преобразование нашего фильтра в формат Compel API
        return {
            status: filter.status,
            date_from: filter.dateFrom,
            date_to: filter.dateTo,
        };
    }

    private parseCompelOrders(data: any): OrderDto[] {
        // Парсинг ответа Compel в наш формат
        return data.orders.map(order => ({
            supplierOrderNumber: order.id,
            status: order.status,
            totalAmount: order.total,
            // ...
        }));
    }

    private parseCompelOrderItem(data: any): OrderItemDto {
        return {
            supplierLineId: data.line_id,
            supplierCode: data.item_code,
            productName: data.description,
            quantity: data.quantity,
            price: data.price,
            // ...
        };
    }
}
```

### DbOnlyOrderIntegration

```typescript
export class DbOnlyOrderIntegration extends AbstractOrderIntegration {
    constructor(
        httpService: HttpService,
        vaultService: VaultService,
        logger: Logger,
        cache: Cache,
        private readonly orderModel: Model<Order>,
        private readonly orderItemModel: Model<OrderItem>,
    ) {
        super(httpService, vaultService, logger, cache);
    }

    getAlias(): string {
        return 'db-only';  // Используется для всех поставщиков без API
    }

    getSupportedOperations(): OrderOperation[] {
        return [
            OrderOperation.LIST_ORDERS,
            OrderOperation.GET_ORDER_ITEMS,
            OrderOperation.ADD_ITEM,
            OrderOperation.UPDATE_ITEM,
            OrderOperation.DELETE_ITEM,
        ];
    }

    async listOrders(filter: OrderFilterDto): Promise<OrderDto[]> {
        const query = this.buildMongoQuery(filter);
        const orders = await this.orderModel.find(query)
            .populate('supplier')
            .populate('currency')
            .sort({ createdAt: -1 });
        return orders.map(order => this.toDto(order));
    }

    async getOrderItems(orderId: string): Promise<OrderItemDto[]> {
        const items = await this.orderItemModel.find({ order: orderId })
            .populate('currency')
            .populate('good')
            .sort({ lineNumber: 1 });
        return items.map(item => this.itemToDto(item));
    }

    async addItem(orderId: string, item: OrderItemDto): Promise<OrderItemDto> {
        const order = await this.orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        const lastLine = await this.orderItemModel.findOne({ order: orderId })
            .sort({ lineNumber: -1 });

        const newItem = new this.orderItemModel({
            ...item,
            order: orderId,
            lineNumber: (lastLine?.lineNumber ?? 0) + 1,
        });

        await newItem.save();
        return this.itemToDto(newItem);
    }

    async updateItem(orderId: string, itemId: string, updates: UpdateOrderItemDto): Promise<OrderItemDto> {
        const item = await this.orderItemModel.findOneAndUpdate(
            { _id: itemId, order: orderId },
            updates,
            { new: true }
        );

        if (!item) {
            throw new NotFoundException(`Item ${itemId} not found in order ${orderId}`);
        }

        return this.itemToDto(item);
    }

    async deleteItem(orderId: string, itemId: string): Promise<void> {
        await this.orderItemModel.deleteOne({ _id: itemId, order: orderId });
    }

    private buildMongoQuery(filter: OrderFilterDto): any {
        const query: any = {};

        if (filter.supplierAlias) {
            query.supplierAlias = filter.supplierAlias;
        }

        if (filter.status) {
            query.status = filter.status;
        }

        if (filter.dateFrom || filter.dateTo) {
            query.createdAt = {};
            if (filter.dateFrom) {
                query.createdAt.$gte = filter.dateFrom;
            }
            if (filter.dateTo) {
                query.createdAt.$lte = filter.dateTo;
            }
        }

        return query;
    }

    private toDto(order: any): OrderDto {
        return {
            id: order._id.toString(),
            orderNumber: order.orderNumber,
            supplierAlias: order.supplierAlias,
            status: order.status,
            // ...
        };
    }

    private itemToDto(item: any): OrderItemDto {
        return {
            id: item._id.toString(),
            lineNumber: item.lineNumber,
            supplierCode: item.supplierCode,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            // ...
        };
    }
}
```

## 6. OrderService

```typescript
@Injectable()
export class OrderService {
    private integrations: Map<string, IOrderIntegration>;

    constructor(
        @InjectModel(Order.name) private orderModel: Model<Order>,
        @InjectModel(OrderItem.name) private orderItemModel: Model<OrderItem>,
        private readonly supplierService: SupplierService,
        private readonly httpService: HttpService,
        private readonly vaultService: VaultService,
        private readonly cache: Cache,
        @InjectQueue('order') private readonly orderQueue: Queue,
    ) {}

    async onModuleInit() {
        // Инициализация интеграций (как в ParsersService)
        this.integrations = new Map();

        // API интеграции
        this.integrations.set('compel', new CompelOrderIntegration(
            this.httpService, this.vaultService, new Logger('CompelOrder'), this.cache
        ));
        this.integrations.set('promelec', new PromelecOrderIntegration(
            this.httpService, this.vaultService, new Logger('PromelecOrder'), this.cache
        ));

        // DB-only для всех остальных
        const dbOnlyIntegration = new DbOnlyOrderIntegration(
            this.httpService, this.vaultService, new Logger('DbOnlyOrder'),
            this.cache, this.orderModel, this.orderItemModel
        );

        // Для всех поставщиков без API используем DB-only
        const allSuppliers = await this.supplierService.findAll();
        allSuppliers.forEach(supplier => {
            if (!this.integrations.has(supplier.alias)) {
                this.integrations.set(supplier.alias, dbOnlyIntegration);
            }
        });
    }

    private getIntegration(supplierAlias: string): IOrderIntegration {
        const integration = this.integrations.get(supplierAlias);
        if (!integration) {
            throw new NotFoundException(`No integration for supplier ${supplierAlias}`);
        }
        return integration;
    }

    async listOrders(supplierAlias: string, filter: OrderFilterDto): Promise<OrderDto[]> {
        const integration = this.getIntegration(supplierAlias);

        if (integration.isOperationSupported(OrderOperation.LIST_ORDERS)) {
            return integration.listOrders(filter);
        } else {
            filter.supplierAlias = supplierAlias;
            return integration.listOrders(filter);
        }
    }

    async createOrder(supplierAlias: string, createDto: CreateOrderDto): Promise<OrderDto> {
        const integration = this.getIntegration(supplierAlias);
        const supplier = await this.supplierService.alias(supplierAlias);

        // Генерируем внутренний номер
        const orderNumber = await this.generateOrderNumber(supplierAlias);

        const order = new this.orderModel({
            orderNumber,
            supplier: supplier.id,
            supplierAlias,
            status: createDto.status || 'draft',
            userId: createDto.userId,
            comment: createDto.comment,
            isApiManaged: integration.isOperationSupported(OrderOperation.CREATE_ORDER),
            statusHistory: [{
                status: 'draft',
                timestamp: new Date(),
                userId: createDto.userId,
            }],
        });

        await order.save();

        // Если API поддерживает создание - создаем там тоже
        if (integration.isOperationSupported(OrderOperation.CREATE_ORDER)) {
            try {
                const apiOrder = await integration.createOrder(createDto);
                order.supplierOrderNumber = apiOrder.supplierOrderNumber;
                order.options = apiOrder.options;
                await order.save();
            } catch (error) {
                // Логируем, но не падаем - заказ в нашей БД уже создан
                this.logger.error(`Failed to create order in ${supplierAlias} API`, error);
            }
        }

        return this.toDto(order);
    }

    async addItem(orderId: string, itemDto: OrderItemDto): Promise<OrderItemDto> {
        const order = await this.orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        const integration = this.getIntegration(order.supplierAlias);

        // Добавляем через интеграцию
        const item = await integration.addItem(orderId, itemDto);

        // Если нужно резервирование и API его поддерживает
        if (itemDto.shouldReserve &&
            integration.isOperationSupported(OrderOperation.RESERVE_ITEM)) {
            await this.orderQueue.add('reserve-item', {
                orderId,
                itemId: item.id,
                quantity: item.quantity,
            });
        }

        return item;
    }

    async updateItem(orderId: string, itemId: string, updates: UpdateOrderItemDto): Promise<OrderItemDto> {
        const order = await this.orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        const integration = this.getIntegration(order.supplierAlias);
        return integration.updateItem(orderId, itemId, updates);
    }

    async deleteItem(orderId: string, itemId: string): Promise<void> {
        const order = await this.orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        const integration = this.getIntegration(order.supplierAlias);
        return integration.deleteItem(orderId, itemId);
    }

    async reserveItem(orderId: string, itemId: string, quantity: number): Promise<ReserveItemDto> {
        const order = await this.orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        const integration = this.getIntegration(order.supplierAlias);
        return integration.reserveItem(orderId, itemId, quantity);
    }

    async getShippingMethods(supplierAlias: string): Promise<ShippingMethodDto[]> {
        const integration = this.getIntegration(supplierAlias);
        return integration.getShippingMethods();
    }

    async createInvoice(orderId: string): Promise<InvoiceDto> {
        const order = await this.orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        const integration = this.getIntegration(order.supplierAlias);
        const invoice = await integration.createInvoice(orderId);

        // Сохраняем данные счета в заказ
        order.invoiceNumber = invoice.number;
        order.invoiceDate = invoice.date;
        await order.save();

        return invoice;
    }

    async shipOrder(orderId: string, shippingMethodId?: string): Promise<ShipmentDto> {
        const order = await this.orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        const integration = this.getIntegration(order.supplierAlias);
        const shipment = await integration.shipOrder(orderId, shippingMethodId);

        // Обновляем статус заказа
        order.status = 'shipped';
        order.shipmentDate = shipment.date;
        order.statusHistory.push({
            status: 'shipped',
            timestamp: shipment.date,
            metadata: { trackingNumber: shipment.trackingNumber },
        });
        await order.save();

        return shipment;
    }

    async getOrderStatus(orderId: string): Promise<OrderStatusDto> {
        const order = await this.orderModel.findById(orderId);
        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        const integration = this.getIntegration(order.supplierAlias);

        // Если API поддерживает - запрашиваем актуальный статус
        if (integration.isOperationSupported(OrderOperation.GET_ORDER_STATUS)) {
            return integration.getOrderStatus(orderId);
        }

        // Иначе возвращаем из БД
        return {
            status: order.status,
            updatedAt: order.updatedAt,
        };
    }

    async getSupportedOperations(supplierAlias: string): Promise<OrderOperation[]> {
        const integration = this.getIntegration(supplierAlias);
        return integration.getSupportedOperations();
    }

    private async generateOrderNumber(supplierAlias: string): Promise<string> {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const lastOrder = await this.orderModel.findOne({
            supplierAlias,
            orderNumber: new RegExp(`^${supplierAlias.toUpperCase()}-${dateStr}`)
        }).sort({ orderNumber: -1 });

        const seq = lastOrder
            ? parseInt(lastOrder.orderNumber.split('-').pop()) + 1
            : 1;

        return `${supplierAlias.toUpperCase()}-${dateStr}-${seq.toString().padStart(4, '0')}`;
    }

    private toDto(order: any): OrderDto {
        return {
            id: order._id.toString(),
            orderNumber: order.orderNumber,
            supplierAlias: order.supplierAlias,
            status: order.status,
            // ...
        };
    }
}
```

## 7. OrderController

```typescript
@ApiTags('order')
@Controller('order')
export class OrderController {
    constructor(
        private readonly orderService: OrderService,
        private readonly exportService: OrderExportService,
    ) {}

    @Get(':supplierAlias')
    @ApiParam({ name: 'supplierAlias', description: 'Supplier alias' })
    @ApiOkResponse({ description: 'List of orders', type: [OrderDto] })
    async listOrders(
        @Param('supplierAlias') supplierAlias: string,
        @Query() filter: OrderFilterDto,
    ): Promise<OrderDto[]> {
        return this.orderService.listOrders(supplierAlias, filter);
    }

    @Post(':supplierAlias')
    @ApiParam({ name: 'supplierAlias', description: 'Supplier alias' })
    @ApiOkResponse({ description: 'Created order', type: OrderDto })
    async createOrder(
        @Param('supplierAlias') supplierAlias: string,
        @Body() createDto: CreateOrderDto,
    ): Promise<OrderDto> {
        return this.orderService.createOrder(supplierAlias, createDto);
    }

    @Get(':orderId/items')
    @ApiParam({ name: 'orderId', description: 'Order ID' })
    @ApiOkResponse({ description: 'Order items', type: [OrderItemDto] })
    async getOrderItems(@Param('orderId') orderId: string): Promise<OrderItemDto[]> {
        return this.orderService.getOrderItems(orderId);
    }

    @Post(':orderId/items')
    @ApiParam({ name: 'orderId', description: 'Order ID' })
    @ApiOkResponse({ description: 'Added order item', type: OrderItemDto })
    async addItem(
        @Param('orderId') orderId: string,
        @Body() itemDto: OrderItemDto,
    ): Promise<OrderItemDto> {
        return this.orderService.addItem(orderId, itemDto);
    }

    @Patch(':orderId/items/:itemId')
    @ApiParam({ name: 'orderId' })
    @ApiParam({ name: 'itemId' })
    async updateItem(
        @Param('orderId') orderId: string,
        @Param('itemId') itemId: string,
        @Body() updates: UpdateOrderItemDto,
    ): Promise<OrderItemDto> {
        return this.orderService.updateItem(orderId, itemId, updates);
    }

    @Delete(':orderId/items/:itemId')
    @ApiParam({ name: 'orderId' })
    @ApiParam({ name: 'itemId' })
    async deleteItem(
        @Param('orderId') orderId: string,
        @Param('itemId') itemId: string,
    ): Promise<void> {
        return this.orderService.deleteItem(orderId, itemId);
    }

    @Post(':orderId/reserve/:itemId')
    @ApiParam({ name: 'orderId' })
    @ApiParam({ name: 'itemId' })
    async reserveItem(
        @Param('orderId') orderId: string,
        @Param('itemId') itemId: string,
        @Body('quantity') quantity: number,
    ): Promise<ReserveItemDto> {
        return this.orderService.reserveItem(orderId, itemId, quantity);
    }

    @Get(':supplierAlias/shipping-methods')
    @ApiParam({ name: 'supplierAlias' })
    async getShippingMethods(
        @Param('supplierAlias') supplierAlias: string,
    ): Promise<ShippingMethodDto[]> {
        return this.orderService.getShippingMethods(supplierAlias);
    }

    @Post(':orderId/invoice')
    @ApiParam({ name: 'orderId' })
    async createInvoice(@Param('orderId') orderId: string): Promise<InvoiceDto> {
        return this.orderService.createInvoice(orderId);
    }

    @Post(':orderId/ship')
    @ApiParam({ name: 'orderId' })
    async shipOrder(
        @Param('orderId') orderId: string,
        @Body('shippingMethodId') shippingMethodId?: string,
    ): Promise<ShipmentDto> {
        return this.orderService.shipOrder(orderId, shippingMethodId);
    }

    @Get(':orderId/status')
    @ApiParam({ name: 'orderId' })
    async getStatus(@Param('orderId') orderId: string): Promise<OrderStatusDto> {
        return this.orderService.getOrderStatus(orderId);
    }

    @Get(':supplierAlias/operations')
    @ApiParam({ name: 'supplierAlias' })
    @ApiOkResponse({ description: 'Supported operations', type: [String] })
    async getSupportedOperations(
        @Param('supplierAlias') supplierAlias: string,
    ): Promise<OrderOperation[]> {
        return this.orderService.getSupportedOperations(supplierAlias);
    }

    @Get(':supplierAlias/export')
    @ApiParam({ name: 'supplierAlias' })
    @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    async exportToXlsx(
        @Param('supplierAlias') supplierAlias: string,
        @Query() filter: OrderFilterDto,
        @Res() res: Response,
    ): Promise<void> {
        const buffer = await this.exportService.exportOrders(supplierAlias, filter);
        res.send(buffer);
    }
}
```

## 8. OrderExportService (XLSX)

```typescript
import * as XLSX from 'xlsx';

@Injectable()
export class OrderExportService {
    constructor(private readonly orderService: OrderService) {}

    async exportOrders(supplierAlias: string, filter: OrderFilterDto): Promise<Buffer> {
        const orders = await this.orderService.listOrders(supplierAlias, filter);

        // Формируем данные для Excel
        const rows = [];
        for (const order of orders) {
            const items = await this.orderService.getOrderItems(order.id);

            for (const item of items) {
                rows.push({
                    'Order Number': order.orderNumber,
                    'Supplier Order #': order.supplierOrderNumber || '',
                    'Status': order.status,
                    'Line #': item.lineNumber,
                    'Supplier Code': item.supplierCode,
                    'Product': item.productName,
                    'Manufacturer': item.manufacturer || '',
                    'Quantity': item.quantity,
                    'Price': item.price,
                    'Currency': item.currency.charCode,
                    'Total': item.quantity * item.price,
                    'Warehouse': item.warehouseName || '',
                    'Delivery Time': item.deliveryTime || '',
                });
            }
        }

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Orders');

        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
}
```

## 9. OrderProcessor (Bull Queue)

```typescript
@Processor('order')
export class OrderProcessor {
    constructor(
        private readonly orderService: OrderService,
        private readonly mailService: MailService,
    ) {}

    @Process('reserve-item')
    async reserveItem(job: Job<{ orderId: string; itemId: string; quantity: number }>): Promise<void> {
        const { orderId, itemId, quantity } = job.data;

        try {
            await this.orderService.reserveItem(orderId, itemId, quantity);
        } catch (error) {
            // Если резервирование не удалось - уведомляем
            await this.mailService.sendOrderError({
                orderId,
                error: `Failed to reserve item ${itemId}: ${error.message}`,
            });
        }
    }

    @Process('sync-order-status')
    async syncOrderStatus(job: Job<{ orderId: string }>): Promise<void> {
        // Периодическая синхронизация статуса с API поставщика
        const { orderId } = job.data;
        const status = await this.orderService.getOrderStatus(orderId);
        // Сохраняем в БД
    }

    @Process('create-invoice')
    async createInvoice(job: Job<{ orderId: string }>): Promise<void> {
        const { orderId } = job.data;
        await this.orderService.createInvoice(orderId);
    }
}
```

## 10. Примеры использования API

### Получить список заказов

```bash
GET /order/compel?status=active&dateFrom=2025-01-01
```

### Создать заказ

```bash
POST /order/compel
{
    "userId": "user123",
    "comment": "Urgent order",
    "status": "draft"
}
```

### Добавить строку заказа

```bash
POST /order/64a1b2c3d4e5f6/items
{
    "supplierCode": "MAX232CPE",
    "productName": "MAX232CPE Driver",
    "manufacturer": "Maxim",
    "quantity": 100,
    "price": 3.50,
    "currencyId": "64abc123",
    "shouldReserve": true
}
```

### Изменить строку

```bash
PATCH /order/64a1b2c3d4e5f6/items/64item789
{
    "quantity": 150,
    "price": 3.25
}
```

### Удалить строку

```bash
DELETE /order/64a1b2c3d4e5f6/items/64item789
```

### Зарезервировать товар

```bash
POST /order/64a1b2c3d4e5f6/reserve/64item789
{
    "quantity": 100
}
```

### Получить способы отгрузки

```bash
GET /order/compel/shipping-methods
```

### Выставить счет

```bash
POST /order/64a1b2c3d4e5f6/invoice
```

### Отгрузить заказ

```bash
POST /order/64a1b2c3d4e5f6/ship
{
    "shippingMethodId": "express"
}
```

### Получить статус заказа

```bash
GET /order/64a1b2c3d4e5f6/status
```

### Получить поддерживаемые операции

```bash
GET /order/compel/operations

Response:
[
    "list_orders",
    "get_order_items",
    "add_item",
    "update_item",
    "delete_item",
    "reserve_item",
    "get_shipping_methods",
    "create_invoice",
    "ship_order"
]
```

### Экспорт в XLSX

```bash
GET /order/compel/export?status=active
```

## 11. Roadmap реализации

### Этап 1: Базовая инфраструктура
1. Создать Order Module
2. Создать схемы БД (Order, OrderItem, OrderStatusHistory)
3. Создать базовые DTOs
4. Создать интерфейсы (IOrderIntegration, OrderOperation)
5. Создать AbstractOrderIntegration

### Этап 2: DB-Only интеграция
1. Реализовать DbOnlyOrderIntegration
2. Создать OrderService с базовой логикой
3. Создать OrderController с CRUD эндпоинтами
4. Протестировать на поставщиках без API

### Этап 3: API интеграции
1. Реализовать CompelOrderIntegration
2. Реализовать PromelecOrderIntegration
3. Добавить поддержку резервирования
4. Добавить обработку ошибок и логирование

### Этап 4: Дополнительный функционал
1. Создать OrderExportService (XLSX)
2. Создать OrderProcessor для Bull Queue
3. Добавить синхронизацию статусов
4. Добавить уведомления по email

### Этап 5: Тестирование и оптимизация
1. Написать unit тесты
2. Написать integration тесты
3. Оптимизировать запросы к БД
4. Добавить кэширование где нужно

## 12. Особенности архитектуры

### Strategy Pattern
- Для каждого поставщика свой класс интеграции
- Единый интерфейс IOrderIntegration
- Абстрактный класс с общей логикой
- Динамический выбор интеграции по alias

### Гибкость схемы
- Поле `options` для специфичных данных каждого поставщика
- Гибкие статусы (строки, не enum)
- История смены статусов
- Опциональная привязка к Good

### Отказоустойчивость
- Graceful degradation (если API недоступен - работаем с БД)
- Error handling на всех уровнях
- Асинхронная обработка через Bull Queue
- Уведомления об ошибках

### Масштабируемость
- Легко добавить нового поставщика
- Легко добавить новую операцию
- Кэширование на уровне интеграций
- Batch операции через очереди

### Переиспользование кода
- Паттерны из AbstractParser
- Vault для credentials
- Bull Queue для async операций
- Mongoose для БД
- Swagger для документации
