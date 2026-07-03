import { ImageResponse } from 'next/og';

// Image metadata for Apple Touch Icon
export const size = {
    width: 180,
    height: 180,
};
export const contentType = 'image/png';

// Image generation
export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'black',
                }}
            >
                <div
                    style={{
                        width: 120,
                        height: 120,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        borderRadius: '12px',
                        transform: 'rotate(3deg)',
                        boxShadow: '0 0 40px rgba(249, 115, 22, 0.5)',
                    }}
                >
                    <span
                        style={{
                            fontSize: 64,
                            fontWeight: 'bold',
                            fontStyle: 'italic',
                            color: 'white',
                            fontFamily: 'serif',
                        }}
                    >
                        S
                    </span>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
