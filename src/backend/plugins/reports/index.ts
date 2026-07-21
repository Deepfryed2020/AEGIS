import { AegisPlugin } from '../registry.js';
import { ReportGenerator } from '../../services/reports/reportGenerator.js';

export const reportGeneratorPlugin: AegisPlugin = {
  id: 'report-generator-default',
  name: 'Report Generator',
  category: 'reports',
  version: '1.0.0',
  description: 'Generates structured investigation reports with cited sections.',
  async execute(context) {
    if (!context.investigationId) return { pluginId: this.id, category: 'reports', data: null };
    const report = await ReportGenerator.generate(context.investigationId, 'markdown');
    return { pluginId: this.id, category: 'reports', data: report };
  },
};

export const reportPlugins: AegisPlugin[] = [reportGeneratorPlugin];
