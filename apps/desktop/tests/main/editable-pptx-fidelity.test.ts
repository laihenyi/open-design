import { describe, expect, test } from 'vitest';

import {
  pseudoBorderNeedsMaterialization,
  reduceBackgroundImageLayers,
  runDomToPptx,
  type PseudoBorderSnapshot,
} from '../../src/main/deck-capture.js';

// dom-to-pptx parses background-image with the greedy regex
// `/linear-gradient\((.*)\)/` behind a bare `includes('linear-gradient')` guard,
// so any multi-layer stack (radial + linear washes, scrim-over-photo,
// repeating-gradient textures) used to come back from the editable PPTX export
// as one corrupt gradient. These tests pin the reduction that now runs in the
// render window before the engine reads the style.
describe('reduceBackgroundImageLayers', () => {
  test('single plain linear-gradient is left untouched', () => {
    const input = 'linear-gradient(135deg, rgb(11, 20, 36) 0%, rgb(16, 28, 50) 100%)';
    expect(reduceBackgroundImageLayers(input)).toEqual({
      changed: false,
      value: input,
      fallbackColor: null,
    });
  });

  test('single url() is left untouched', () => {
    const input = 'url("http://127.0.0.1:1234/raw/assets/photo.png")';
    expect(reduceBackgroundImageLayers(input)).toEqual({
      changed: false,
      value: input,
      fallbackColor: null,
    });
  });

  test('none is a no-op', () => {
    expect(reduceBackgroundImageLayers('none')).toEqual({
      changed: false,
      value: 'none',
      fallbackColor: null,
    });
  });

  test('radial wash over base linear-gradient keeps the linear base layer', () => {
    // The layer list is top-first, so the linear-gradient is the visual base.
    const linear = 'linear-gradient(160deg, rgb(11, 20, 36) 0%, rgb(20, 33, 56) 100%)';
    const input = `radial-gradient(ellipse at 30% 20%, rgba(212, 175, 55, 0.08), transparent 60%), ${linear}`;
    expect(reduceBackgroundImageLayers(input)).toEqual({
      changed: true,
      value: linear,
      fallbackColor: null,
    });
  });

  test('scrim gradient over url() photo keeps the photo, not the scrim', () => {
    const url = 'url("https://example.com/hero.jpg")';
    const input = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), ${url}`;
    expect(reduceBackgroundImageLayers(input)).toEqual({
      changed: true,
      value: url,
      fallbackColor: null,
    });
  });

  test('commas inside color stops never split a layer', () => {
    const input =
      'linear-gradient(90deg, rgba(212, 175, 55, 0.35) 0%, rgba(212, 175, 55, 0) 100%), ' +
      'linear-gradient(0deg, rgb(11, 20, 36), rgb(11, 20, 36))';
    const out = reduceBackgroundImageLayers(input);
    expect(out.changed).toBe(true);
    expect(out.value).toBe('linear-gradient(0deg, rgb(11, 20, 36), rgb(11, 20, 36))');
  });

  test('repeating-gradient texture stack drops the image and surfaces a fallback color', () => {
    // repeating-linear-gradient matches the engine's `includes('linear-gradient')`
    // guard and used to render as one wrong full-element gradient.
    const input =
      'repeating-linear-gradient(0deg, rgba(11, 20, 36, 0.04) 0px, rgba(11, 20, 36, 0.04) 1px, transparent 1px, transparent 36px), ' +
      'repeating-linear-gradient(90deg, rgba(11, 20, 36, 0.04) 0px, rgba(11, 20, 36, 0.04) 1px, transparent 1px, transparent 36px)';
    expect(reduceBackgroundImageLayers(input)).toEqual({
      changed: true,
      value: 'none',
      fallbackColor: 'rgba(11, 20, 36, 0.04)',
    });
  });

  test('lone radial-gradient drops to none with the first stop as fallback color', () => {
    const input = 'radial-gradient(circle at 50% 0%, rgb(26, 42, 71) 0%, rgb(11, 20, 36) 70%)';
    expect(reduceBackgroundImageLayers(input)).toEqual({
      changed: true,
      value: 'none',
      fallbackColor: 'rgb(26, 42, 71)',
    });
  });

  test('conic-gradient with hex stops falls back to the first hex color', () => {
    const input = 'conic-gradient(from 0deg, #0b1424, #d4af37, #0b1424)';
    expect(reduceBackgroundImageLayers(input)).toEqual({
      changed: true,
      value: 'none',
      fallbackColor: '#0b1424',
    });
  });
});

// dom-to-pptx draws a contentless ::before/::after as ONE rect whose `line`
// outlines all four sides, so partial-border decorations (corner brackets,
// rotated arrow heads) exported as full boxes. These tests pin the detector
// that decides which pseudos get materialized as real per-side-border elements.
describe('pseudoBorderNeedsMaterialization', () => {
  const base: PseudoBorderSnapshot = {
    content: '""',
    display: 'block',
    borderTopWidth: '0px',
    borderRightWidth: '0px',
    borderBottomWidth: '0px',
    borderLeftWidth: '0px',
  };

  test('corner bracket (top + left borders only) needs materialization', () => {
    expect(
      pseudoBorderNeedsMaterialization({ ...base, borderTopWidth: '2px', borderLeftWidth: '2px' }),
    ).toBe(true);
  });

  test('arrow head (right + bottom borders, rotated) needs materialization', () => {
    expect(
      pseudoBorderNeedsMaterialization({ ...base, borderRightWidth: '3px', borderBottomWidth: '3px' }),
    ).toBe(true);
  });

  test('uniform four-side border is the case the engine already draws right', () => {
    expect(
      pseudoBorderNeedsMaterialization({
        ...base,
        borderTopWidth: '1px',
        borderRightWidth: '1px',
        borderBottomWidth: '1px',
        borderLeftWidth: '1px',
      }),
    ).toBe(false);
  });

  test('four sides with unequal widths still need materialization', () => {
    expect(
      pseudoBorderNeedsMaterialization({
        ...base,
        borderTopWidth: '4px',
        borderRightWidth: '1px',
        borderBottomWidth: '1px',
        borderLeftWidth: '1px',
      }),
    ).toBe(true);
  });

  test('borderless pseudo is left alone', () => {
    expect(pseudoBorderNeedsMaterialization(base)).toBe(false);
  });

  test('text-content pseudo rides the engine text path and is left alone', () => {
    expect(
      pseudoBorderNeedsMaterialization({ ...base, content: '"→"', borderBottomWidth: '2px' }),
    ).toBe(false);
  });

  test('content: none means no pseudo box exists', () => {
    expect(
      pseudoBorderNeedsMaterialization({ ...base, content: 'none', borderTopWidth: '2px' }),
    ).toBe(false);
  });

  test('display: none pseudo is left alone', () => {
    expect(
      pseudoBorderNeedsMaterialization({ ...base, display: 'none', borderTopWidth: '2px' }),
    ).toBe(false);
  });
});

// runDomToPptx is serialized into the render window, so its wiring can only be
// pinned through its source (matching the existing background-stabilization
// tests in scroll-stitch-geometry.test.ts).
describe('runDomToPptx fidelity wiring', () => {
  test('normalizes background paint and materializes uneven pseudo borders', () => {
    const source = runDomToPptx.toString();
    expect(source).toContain('normalizeBackgroundPaint(slides');
    expect(source).toContain('materializeUnevenPseudoBorders(slides');
    // Both passes must run AFTER the injected slide background layer exists so
    // that layer is normalized too.
    expect(source.indexOf('ensureExplicitSlideBackgrounds(slides')).toBeLessThan(
      source.indexOf('normalizeBackgroundPaint(slides'),
    );
    // The neutralizing rule must zero the paint, not just suppress the box —
    // the engine reads a suppressed pseudo's computed border as if it existed.
    expect(source).toContain('content:none!important;border:0!important');
  });
});
