import React from 'react';
import type { BrandStyle } from '@/lib/types';
import { BRAND_FONT_FAMILY, FONT_WEIGHT } from '@/lib/brand-tokens';

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

// Editorial restyle: hairline-bordered cards, Inter, uppercase letter-spaced
// labels, thin chevron connectors. The first node is "featured" with a solid
// ink fill (reversed out), the rest are open cards — mirrors the reference
// carousels' navy-on-ivory look. All colors come from brandStyle, which the
// slide synthesizes to contrast with the resolved background (accent === ink),
// so this reads correctly on both light and dark slides.
export function ConceptFlowGraphic({ nodes = DEFAULTS, title, brandStyle }: Props) {
  const ink       = brandStyle?.accent    ?? brandStyle?.headline ?? '#01253f';
  const secondary = brandStyle?.secondary ?? '#6b7280';
  const bg        = brandStyle?.background ?? '#F7F4EF';

  const n = Math.min(Math.max((nodes ?? []).length, 2), 5);
  const list = (nodes ?? []).slice(0, n);

  const labelSize   = n <= 3 ? 22 : n <= 4 ? 18 : 15;
  const subSize     = n <= 3 ? 15 : 13;
  const hasSublabel = list.some(node => !!node.sublabel);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 12px',
      boxSizing: 'border-box',
      fontFamily: BRAND_FONT_FAMILY,
    }}>
      {title && (
        <div style={{
          fontFamily: BRAND_FONT_FAMILY,
          fontSize: 13,
          fontWeight: FONT_WEIGHT.heading,
          color: secondary,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 22,
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
              {/* Node card */}
              <div style={{
                flex: 1,
                background: isFeatured ? ink : 'transparent',
                border: `1px solid ${ink}`,
                borderRadius: 12,
                padding: '18px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minWidth: 0,
                minHeight: hasSublabel ? 118 : 84,
              }}>
                <div style={{
                  fontFamily: BRAND_FONT_FAMILY,
                  fontSize: labelSize,
                  fontWeight: FONT_WEIGHT.heading,
                  color: isFeatured ? bg : ink,
                  lineHeight: 1.2,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                }}>
                  {node.label}
                </div>
                {node.sublabel && (
                  <>
                    {/* thin divider under the label */}
                    <div style={{
                      width: 22,
                      height: 1,
                      background: isFeatured ? bg : ink,
                      opacity: isFeatured ? 0.5 : 0.35,
                      margin: '10px 0',
                    }} />
                    <div style={{
                      fontFamily: BRAND_FONT_FAMILY,
                      fontSize: subSize,
                      fontWeight: FONT_WEIGHT.body,
                      color: isFeatured ? bg : secondary,
                      opacity: isFeatured ? 0.82 : 1,
                      lineHeight: 1.35,
                      wordBreak: 'break-word',
                    }}>
                      {node.sublabel}
                    </div>
                  </>
                )}
              </div>

              {/* Thin chevron connector between nodes */}
              {i < n - 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 10px',
                  flexShrink: 0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ opacity: 0.55 }}>
                    <path d="M9 6l6 6-6 6" />
                  </svg>
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
