function normalizePriority(priority) {
  if (priority == null || priority === '') return 'normal';
  return String(priority).toLowerCase();
}

function normalizeLabels(labels) {
  if (Array.isArray(labels)) {
    return labels
      .map((label) => String(label || '').trim())
      .filter(Boolean);
  }

  if (typeof labels !== 'string') return [];

  return labels
    .split(/[\n,]/)
    .map((label) => label.trim())
    .filter(Boolean);
}

function normalizeBeadDraft(draft = {}) {
  return {
    title: String(draft.title || '').trim(),
    description: String(draft.description || '').trim(),
    priority: normalizePriority(draft.priority),
    labels: normalizeLabels(draft.labels),
  };
}

function normalizeDispatch(dispatch = {}) {
  const mode = String(dispatch.mode || 'none').toLowerCase();
  return {
    mode: ['none', 'first', 'all'].includes(mode) ? mode : 'none',
    target: dispatch.target ? String(dispatch.target).trim() : '',
    molecule: dispatch.molecule ? String(dispatch.molecule).trim() : '',
    args: dispatch.args ? String(dispatch.args).trim() : '',
  };
}

function pickDispatchError(result) {
  return result?.body?.error || result?.error || 'Dispatch failed';
}

export class WorkCreationService {
  constructor({ beadService, convoyService, workService } = {}) {
    if (!beadService?.create || !beadService?.get) {
      throw new Error('WorkCreationService requires beadService.create() and beadService.get()');
    }
    if (!convoyService?.create || !convoyService?.get) {
      throw new Error('WorkCreationService requires convoyService.create() and convoyService.get()');
    }
    if (!workService?.sling) {
      throw new Error('WorkCreationService requires workService.sling()');
    }

    this._beads = beadService;
    this._convoys = convoyService;
    this._work = workService;
  }

  async create(payload = {}) {
    const mode = String(payload.mode || 'single').toLowerCase();
    if (mode === 'convoy') return this.createConvoy(payload);
    return this.createSingle(payload);
  }

  async createSingle(payload = {}) {
    const beadDraft = normalizeBeadDraft(payload.bead);
    if (!beadDraft.title) {
      return { ok: false, statusCode: 400, error: 'Bead title is required' };
    }

    const createdBead = await this._createBead(beadDraft);
    if (!createdBead.ok) return createdBead;

    const dispatchMode = payload.dispatch?.sling ? 'first' : 'none';
    const dispatch = normalizeDispatch({ ...payload.dispatch, mode: dispatchMode });
    const dispatchResults = await this._dispatchCreatedBeads([createdBead.bead], dispatch);
    const bead = this._mergeDispatchState(createdBead.bead, dispatchResults[0] ?? null);

    return {
      ok: true,
      data: {
        mode: 'single',
        outcome: this._outcomeForDispatch(dispatchResults),
        bead,
        beads: [bead],
        convoy: null,
      },
    };
  }

  async createConvoy(payload = {}) {
    const convoyName = String(payload.convoy?.name || '').trim();
    if (!convoyName) {
      return { ok: false, statusCode: 400, error: 'Convoy name is required' };
    }

    const drafts = Array.isArray(payload.beads)
      ? payload.beads.map(normalizeBeadDraft).filter((draft) => draft.title)
      : [];

    if (drafts.length === 0) {
      return { ok: false, statusCode: 400, error: 'At least one bead is required' };
    }

    const createdBeads = [];
    for (const draft of drafts) {
      const result = await this._createBead(draft);
      if (!result.ok) {
        return {
          ok: false,
          statusCode: result.statusCode || 500,
          error: result.error,
          data: {
            mode: 'convoy',
            convoy: null,
            beads: createdBeads,
          },
        };
      }
      createdBeads.push(result.bead);
    }

    const convoyResult = await this._convoys.create({
      name: convoyName,
      issues: createdBeads.map((bead) => bead.id),
      notify: payload.convoy?.notify ? String(payload.convoy.notify).trim() : '',
    });

    if (!convoyResult.ok) {
      return {
        ok: false,
        statusCode: convoyResult.statusCode || 500,
        error: convoyResult.error || 'Failed to create convoy',
        data: {
          mode: 'convoy',
          convoy: null,
          beads: createdBeads,
        },
      };
    }

    const convoyId = convoyResult.convoyId || null;
    let convoy = {
      id: convoyId,
      title: convoyName,
      notify: payload.convoy?.notify ? String(payload.convoy.notify).trim() : '',
      total: createdBeads.length,
      completed: 0,
    };

    if (convoyId) {
      try {
        const detail = await this._convoys.get(convoyId);
        convoy = {
          id: detail.id || convoy.id,
          title: detail.title || convoy.title,
          notify: convoy.notify,
          total: detail.total ?? convoy.total,
          completed: detail.completed ?? convoy.completed,
        };
      } catch {
        // Fresh convoy creation can race the CLI cache; the id + title are enough for follow-through.
      }
    }

    const dispatch = normalizeDispatch(payload.dispatch);
    const dispatchResults = await this._dispatchCreatedBeads(createdBeads, dispatch);
    const beads = createdBeads.map((bead, index) =>
      this._mergeDispatchState(bead, dispatchResults[index] ?? null),
    );

    return {
      ok: true,
      data: {
        mode: 'convoy',
        outcome: this._outcomeForDispatch(dispatchResults),
        bead: null,
        beads,
        convoy,
      },
    };
  }

  async _createBead(draft) {
    const result = await this._beads.create(draft);
    if (!result.ok) {
      return {
        ok: false,
        statusCode: result.statusCode || 500,
        error: result.error || 'Failed to create bead',
      };
    }

    const beadId = result.beadId;
    let detail = null;
    if (beadId) {
      const detailResult = await this._beads.get(beadId);
      if (detailResult.ok) detail = detailResult.bead;
    }

    return {
      ok: true,
      bead: {
        id: beadId || detail?.id || draft.title,
        title: detail?.title || draft.title,
        description: detail?.description || draft.description || '',
        priority: detail?.priority,
        status: detail?.status || 'open',
        issue_type: detail?.issue_type,
      },
    };
  }

  async _dispatchCreatedBeads(beads, dispatch) {
    if (!Array.isArray(beads) || beads.length === 0) return [];
    if (dispatch.mode === 'none') {
      return beads.map(() => null);
    }

    const chosenBeads = dispatch.mode === 'first' ? beads.slice(0, 1) : beads;
    const resultsById = new Map();

    for (const bead of chosenBeads) {
      const result = await this._work.sling({
        bead: bead.id,
        target: dispatch.target || undefined,
        molecule: dispatch.molecule || undefined,
        args: dispatch.args || undefined,
      });

      resultsById.set(bead.id, {
        ok: Boolean(result.ok),
        target: dispatch.target || null,
        error: result.ok ? null : pickDispatchError(result),
      });
    }

    return beads.map((bead) => resultsById.get(bead.id) ?? null);
  }

  _mergeDispatchState(bead, dispatch) {
    if (!dispatch) {
      return {
        ...bead,
        workflow_state: 'created',
        dispatch: null,
      };
    }

    return {
      ...bead,
      workflow_state: dispatch.ok ? 'slung' : 'dispatch_failed',
      dispatch,
    };
  }

  _outcomeForDispatch(dispatchResults) {
    const relevant = dispatchResults.filter(Boolean);
    if (relevant.length === 0) return 'created';
    return relevant.every((result) => result.ok) ? 'slung' : 'partial';
  }
}
