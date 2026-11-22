export function wavBytes(freq = 440, seconds = 0.2, sampleRate = 8000): Uint8Array {
  const count = Math.floor(sampleRate * seconds);
  const data = new Uint8Array(44 + count);
  const view = new DataView(data.buffer);
  writeText(data, 0, "RIFF");
  view.setUint32(4, 36 + count, true);
  writeText(data, 8, "WAVE");
  writeText(data, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeText(data, 36, "data");
  view.setUint32(40, count, true);
  for (let i = 0; i < count; i++) {
    const envelope = 1 - i / count;
    data[44 + i] = 128 + Math.round(Math.sin((i / sampleRate) * freq * Math.PI * 2) * 40 * envelope);
  }
  return data;
}

function writeText(bytes: Uint8Array, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
}
