import React from 'react';
import type { BrandStyle } from '@/lib/types';

interface Node { label: string; sublabel?: string }
interface Props {
  nodes?: Node[];
  title?: string;
  brandStyle?: BrandStyle;
}

const DEFAULTS: Node[] = [
  { label: 'Blue light',     sublabel: 'suppresses melatonin' },
  { label: 'Cortisol spikes', sublabel: 'delays sleep onset' },
  { label: 'Less REM',       sublabel: 'poor memory' },
  { label: 'More stress',    sublabel: 'cycle repeats' },
];

export function ConceptFlowGraphic({ nodes = DEFAULTS, title, brandStyle }: Props) {
  const accent    = brandStyle?.accent    ?? '#1e7a8a';
  const secondary = brandStyle?.secondary ?? '#6b7280';
  const bodyColor = brandStyle?.body      ?? '#1a2535';

  const n = Math.min(Math.max((nodes ?? []).length, 2), 5);
  const list = (nodes ?? []).slice(0, n);

  const labelSize   = n <= 3 ? 21 : n <= 4 ? 18 : 15;
  const subSize     = n <= 3 ? 15 : 13;
  const hasSublabel = list.some(node => !!node.sublabel);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 32px',
      boxSizing: 'border-box',
      gap: 0,
    }}>
      {title && (
        <div style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 13,
          fontWeight: 700,
          color: secondary,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 16,
          textAlign: 'center',
        }}>
          {title}
        </div>
      )}

      {/* Nodes row */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        flex: 1,
        gap: 0,
      }}>
        {list.map((node, i) => {
          const isFeatured = i === 0;
          return (
            <React.Fragment key={i}>
              {/* Node pill */}
              <div style={{
                flex: 1,
                background: isFeatured ? accent : `${accent}12`,
                border: `2px solid ${isFeatured ? 'transparent' : accent}`,
                borderRadius: 16,
                padding: '20px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minWidth: 0,
                minHeight: hasSublabel ? 120 : 90,
              }}>
                <div style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: labelSize,
                  fontWeight: 700,
                  color: isFeatured ? '#fff' : accent,
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}>
                  {node.label}
                </div>
                {node.sublabel && (
                  <div style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: subSize,
                    color: isFeatured ? 'rgba(255,255,255,0.75)' : secondary,
                    marginTop: 8,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    fontStyle: 'italic',
                  }}>
                    {node.sublabel}
                  </div>
                )}
              </div>

              {/* Arrow between nodes */}
              {i < n - 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 8px',
                  flexShrink: 0,
                  color: accent,
                  fontSize: 22,
                  fontWeight: 300,
                  opacity: 0.7,
                }}>
                  →
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default ConceptFlowGraphic;
