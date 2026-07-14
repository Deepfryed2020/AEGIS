import { FederalConnector } from './government/federal.js';
import { ATOConnector } from './government/ato.js';
import { ABSConnector } from './government/abs.js';
import { TreasuryConnector } from './government/treasury.js';
import { ParliamentConnector } from './government/parliament.js';
import { AIHWConnector } from './government/aihw.js';
import { ANAOConnector } from './government/anao.js';
import { ACCCConnector } from './government/accc.js';
import { ASICConnector } from './government/asic.js';
import { RBAConnector } from './government/rba.js';

export const Connectors = [
  FederalConnector,
  ATOConnector,
  ABSConnector,
  TreasuryConnector,
  ParliamentConnector,
  AIHWConnector,
  ANAOConnector,
  ACCCConnector,
  ASICConnector,
  RBAConnector,
];

export function getConnectorByName(name: string) {
  return Connectors.find((connector) => connector.name === name);
}
