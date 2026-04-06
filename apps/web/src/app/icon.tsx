import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#34d399',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#06060a',
            fontFamily: 'sans-serif',
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '-0.5px',
          }}
        >
          CA
        </span>
      </div>
    ),
    { ...size },
  );
}
