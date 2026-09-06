import type { AlgorithmId } from '../../state/types';
import type { RasterAlgorithm } from './types';
import { thresholdAlgorithm } from './threshold';
import { halftoneAlgorithm } from './halftone';

// Registry: adding a new algorithm module means writing the module and
// adding one line here -- nothing else in the app needs to change.
export const algorithms: Record<AlgorithmId, RasterAlgorithm> = {
  threshold: thresholdAlgorithm,
  halftone: halftoneAlgorithm,
};
