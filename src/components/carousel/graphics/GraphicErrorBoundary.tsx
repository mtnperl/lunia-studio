'use client';

import React, { Component, ReactNode } from 'react';
import type { GraphicSpec } from '@/lib/types';

interface Props {
  children: ReactNode;
  graphicSpec?: GraphicSpec | null;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary wrapping the graphic zone in ContentSlide.
 * If a graphic component throws during render, logs the error + spec data
 * and falls back to null (text-only slide). Prevents a broken component
 * from crashing the entire carousel.
 */
export class GraphicErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GraphicErrorBoundary] Graphic component threw:', error, {
        graphicSpec: this.props.graphicSpec,
      });
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
