import { Client, enterPassiveModeIPv4 } from 'basic-ftp';
import { Writable } from 'stream';

// Скачивает файл с FTP в память. По умолчанию basic-ftp сначала пробует EPSV,
// а у сервера Элтеха канал данных в EPSV зависает — поэтому сразу PASV.
export async function ftpDownload(url: string, user: string, password: string, fileName: string): Promise<Buffer> {
    const { hostname, port } = new URL(url);
    const remotePath = new URL(fileName, url).pathname;
    const chunks: Buffer[] = [];
    const client = new Client();
    client.prepareTransfer = enterPassiveModeIPv4;
    try {
        await client.access({ host: hostname, port: port ? Number(port) : 21, user, password });
        await client.downloadTo(
            new Writable({
                write(chunk, _encoding, callback) {
                    chunks.push(chunk);
                    callback();
                },
            }),
            remotePath,
        );
    } finally {
        client.close();
    }
    return Buffer.concat(chunks);
}
