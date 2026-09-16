import type { AlgorithmId } from '../../state/types';
import type { RasterAlgorithm } from './types';
import { thresholdAlgorithm } from './threshold';
import { halftoneAlgorithm } from './halftone';
import { bayer2Algorithm, bayer4Algorithm, bayer8Algorithm } from './bayer';
import { floydSteinbergAlgorithm } from './floydSteinberg';
import { atkinsonAlgorithm } from './atkinson';
import { posterizeAlgorithm } from './posterize';
import { hybridAlgorithm } from './hybrid';

// Registry: adding a new algorithm module means writing the module and
// adding one line here -- nothing else in the app needs to change. Order
// here is the order options appear in the Algorithm dropdown.
export const algorithms: Record<AlgorithmId, RasterAlgorithm> = {
  threshold: thresholdAlgorithm,
  halftone: halftoneAlgorithm,
  bayer2: bayer2Algorithm,
  bayer4: bayer4Algorithm,
  bayer8: bayer8Algorithm,
  floydSteinberg: floydSteinbergAlgorithm,
  atkinson: atkinsonAlgorithm,
  posterize: posterizeAlgorithm,
  hybrid: hybridAlgorithm,
};
