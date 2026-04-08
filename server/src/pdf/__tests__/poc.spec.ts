import { renderHelloWorldPdf } from '../poc.example';

describe('renderHelloWorldPdf (PoC)', () => {
  it('generates a non-empty PDF buffer', async () => {
    const buffer = await renderHelloWorldPdf();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('starts with PDF magic bytes', async () => {
    const buffer = await renderHelloWorldPdf();
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });

  it('generates a PDF larger than 1KB', async () => {
    const buffer = await renderHelloWorldPdf();
    expect(buffer.length).toBeGreaterThan(1024);
  });
});
