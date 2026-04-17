'use client';
import { useState } from 'react';

export default function Home() {
  const [cid, setCid] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (form.elements.namedItem('file') as HTMLInputElement).files?.[0];
    if (!file) return;

    const res = await fetch('/api/pin', {
      method: 'POST',
      headers: { 'x-filename': file.name, 'content-type': 'application/octet-stream' },
      body: file,
    });
    const pin = await res.json();
    setCid(pin.cid);
  }

  return (
    <main style={{ maxWidth: 640, margin: '4rem auto', fontFamily: 'system-ui' }}>
      <h1>Pin to NDN IPFS Chain</h1>
      <form onSubmit={upload}>
        <input type="file" name="file" required />
        <button type="submit">Pin</button>
      </form>
      {cid && (
        <p>
          Pinned →{' '}
          <a href={`https://gateway.ndnipfs.link/${cid}`} target="_blank" rel="noreferrer">
            {cid}
          </a>
        </p>
      )}
    </main>
  );
}
