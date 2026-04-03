function deriveAgentName(address = '') {
  const parts = String(address).split('/').filter(Boolean);
  return parts.at(-1) || address;
}

function normalizeRigAgent(agent = {}, rigName = '') {
  const address = agent.address || agent.agent || (rigName && agent.name ? `${rigName}/${agent.name}` : agent.name || '');

  return {
    ...agent,
    address,
    name: agent.name || deriveAgentName(address),
    rig: agent.rig || rigName,
  };
}

export function normalizeRigAgents(rig = {}) {
  if (Array.isArray(rig.agents) && rig.agents.length > 0) {
    return rig.agents.filter(Boolean).map(agent => normalizeRigAgent(agent, rig.name));
  }

  return (rig.hooks || [])
    .filter(Boolean)
    .map(hook => normalizeRigAgent(hook, rig.name));
}
