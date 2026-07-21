import { AegisPlugin } from '../registry.js';
import { TimelineReconstructor } from '../../services/timeline/timelineReconstructor.js';

export const timelineReconstructorPlugin: AegisPlugin = {
  id: 'timeline-reconstructor-default',
  name: 'Timeline Reconstructor',
  category: 'timeline',
  version: '1.0.0',
  description: 'Merges timelines across documents and detects gaps, conflicts, and causal chains.',
  async execute(context) {
    const evidenceIds = context.investigationId ? undefined : undefined;
    const timeline = await TimelineReconstructor.reconstruct(evidenceIds);
    return { pluginId: this.id, category: 'timeline', data: timeline };
  },
};

export const timelinePlugins: AegisPlugin[] = [timelineReconstructorPlugin];
