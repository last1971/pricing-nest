// Некоторые поставщики отдают невалидный JSON (axios при неудачном парсе молча оставляет тело строкой).
// Чиним итеративно: парсим, при ошибке исправляем дефект по позиции из сообщения JSON.parse и повторяем.
// Валидный JSON парсится с первой попытки и не трогается. Известные дефекты:
//  - platan: внутренние кавычки в текстовых полях экранированы как /" вместо \";
//  - promelec: сырые управляющие символы (\r\n и т.п.) внутри строковых литералов.
const CONTROL_ESCAPES = { '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t' };

export function repairSupplierJson(raw: string): any {
    let s = raw;
    for (let guard = 0; guard <= raw.length; guard++) {
        try {
            return JSON.parse(s);
        } catch (e) {
            const message = (e as Error).message;
            const pos = Number(message.match(/position (\d+)/)?.[1]);
            if (Number.isNaN(pos)) throw e;
            if (message.includes('Bad control character')) {
                const escaped =
                    CONTROL_ESCAPES[s[pos]] ?? '\\u' + s.charCodeAt(pos).toString(16).padStart(4, '0');
                s = s.slice(0, pos) + escaped + s.slice(pos + 1);
                continue;
            }
            const idx = s.lastIndexOf('/"', pos);
            if (idx === -1) throw e;
            s = s.slice(0, idx) + '\\"' + s.slice(idx + 2);
        }
    }
    return JSON.parse(s);
}
