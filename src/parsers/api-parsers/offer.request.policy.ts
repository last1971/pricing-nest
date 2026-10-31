import { ApiResponseDto } from './api.response.dto';

/** Ошибка одной котировки не блокирует проверки остальных товаров и не рассылает письма из checkout. */
export async function markOfferFailure(response: ApiResponseDto): Promise<void> {
    if (response.isFinished) return;
    response.isSuccess = false;
    response.errorMessage = 'Checkout supplier offer lookup failed or timed out';
}
