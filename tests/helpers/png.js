// テスト用PNGをメモリ上で生成するユーティリティ（バイナリをコミットしないため）
const zlib = require('zlib');

function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let k = 0; k < 8; k++) {
            c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
        }
    }
    return (~c) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * グラデーション＋市松模様のRGBA PNGを生成
 * @param {number} width
 * @param {number} height
 * @returns {Buffer}
 */
function makePng(width = 120, height = 120) {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type: RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    const stride = 1 + width * 4;
    const raw = Buffer.alloc(height * stride);
    for (let y = 0; y < height; y++) {
        raw[y * stride] = 0; // フィルタタイプ: None
        for (let x = 0; x < width; x++) {
            const o = y * stride + 1 + x * 4;
            raw[o] = (x * 255 / width) | 0;          // R: 横グラデーション
            raw[o + 1] = (y * 255 / height) | 0;     // G: 縦グラデーション
            raw[o + 2] = ((x + y) % 2 === 0) ? 200 : 40; // B: 市松
            raw[o + 3] = 255;                         // A
        }
    }

    return Buffer.concat([
        sig,
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

module.exports = { makePng };
