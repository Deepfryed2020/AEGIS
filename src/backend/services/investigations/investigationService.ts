import { v4 as uuid } from 'uuid';
import { Investigation } from '../../../shared/models.js';
import { Storage } from '../../storage.js';

export const InvestigationService = {
  async create(title: string, description: string): Promise<Investigation> {
    const investigation: Investigation = {
      id: uuid(),
      title,
      description,
      createdAt: new Date().toISOString(),
      evidenceIds: [],
      notes: ''
    };
    await Storage.addInvestigation(investigation);
    return investigation;
  },
  async addEvidence(investigationId: string, evidenceId: string) {
    return Storage.linkEvidenceToInvestigation(investigationId, evidenceId);
  }
};
