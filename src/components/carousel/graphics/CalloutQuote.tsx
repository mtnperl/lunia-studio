import type { BrandStyle } from '@/lib/types';

interface Props {
  text?: string;
  source?: string;
  brandStyle?: BrandStyle;
}

export function CalloutQuote({
  text   = 'Most people get less deep sleep than they realise — and that is where recovery happens.',
  source,
  brandStyle,
}: Props) {
  const accent    = brandStyle?.accent    ?? '#1e7a8a';
  const bodyColor = brandStyle?.body      ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '36px 56px 36px 60px',
      minHeight: 460,
      boxSizing: 'border-box',
      position: 'relative',
    }}>
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 36,
        bottom: 36,
        width: 6,
        borderRadius: 3,
        background: accent,
      }} />

      {/* Opening quote mark */}
      <div style={{
        fontFamily: 'Georgia, serif',
        fontSize: 120,
        lineHeight: 0.75,
        color: `${accent}28`,
        fontWeight: 700,
        marginBottom: 12,
        userSelect: 'none',
      }}>
        &ldquo;
      </div>

      {/* Quote text — wraps naturally */}
      <div style={{
        fontFamily: 'Outfit, sans-serif',
        fontSize: 34,
        fontWeight: 500,
        color: bodyColor,
        lineHeight: 1.55,
        wordBreak: 'break-word',
        flex: 1,
      }}>
        {text}
      </div>

      {/* Source attribution */}
      {source && (
        <div style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 20,
          color: secondary,
          marginTop: 28,
        }}>
          &mdash; {source}
        </div>
      )}
    </div>
  );
}

export default CalloutQuote;
