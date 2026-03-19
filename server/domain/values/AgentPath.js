import { SafeSegment } from './SafeSegment.js';

export class AgentPath {
  constructor(rig, name) {
    this.rig = rig instanceof SafeSegment ? rig : new SafeSegment(rig, { label: 'rig' });
    this.name = name instanceof SafeSegment ? name : new SafeSegment(name, { label: 'agent name' });
    Object.freeze(this);
  }

  static fromString(value) {
    const [rig, name, ...rest] = String(value || '').split('/');
    if (!rig || !name || rest.length > 0) {
      throw new Error('Invalid agent path');
    }
    return new AgentPath(rig, name);
  }

  toString() {
    return `${this.rig}/${this.name}`;
  }

  toSessionName(rigPrefix) {
    if (!rigPrefix) {
      throw new Error('AgentPath.toSessionName requires rigPrefix');
    }
    return `${rigPrefix}-${this.name}`;
  }

  equals(other) {
    return other instanceof AgentPath
      && this.rig.value === other.rig.value
      && this.name.value === other.name.value;
  }
}
