import type { EditorialHookImageSpec } from "./types";

/**
 * The spec an editorial hook image is built from, or undefined when the hook
 * should not use the editorial framework at all.
 *
 * The framework is what bakes the headline into the image and carries the hard
 * "no product, no bottle, no amber glass" rule. A caller that sends only
 * { topic, hook } has no spec, and used to fall through to the generic mood
 * prompt, which has neither: the headline came back blank and the model made
 * up a bottle. So when there is a headline to bake, a minimal spec is built
 * from the topic and the framework runs anyway.
 */
export function resolveEditorialHookSpec(args: {
  slideIndex: number;
  isEditorial: boolean;
  hookHeadline: string;
  topic: string;
  spec?: EditorialHookImageSpec;
}): EditorialHookImageSpec | undefined {
  const { slideIndex, isEditorial, hookHeadline, topic, spec } = args;
  if (slideIndex !== 0 || !isEditorial) return undefined;
  if (spec && (spec.concept || spec.subject)) return spec;
  if (hookHeadline.trim() && topic.trim()) return { ...spec, concept: topic.trim() };
  return undefined;
}
