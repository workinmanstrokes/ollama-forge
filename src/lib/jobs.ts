export type JobView = {
  projectId: string;
  phase: string;
  output: string;
  error: string;
  done: boolean;
  cancelled: boolean;
};

type Listener = (job: JobView) => void;

type Entry = {
  job: JobView;
  abort: AbortController;
};

const jobs = new Map<string, Entry>();
const listeners = new Map<string, Set<Listener>>();

function emit(projectId: string) {
  const entry = jobs.get(projectId);
  if (!entry) return;
  const snapshot = { ...entry.job };
  for (const listener of listeners.get(projectId) ?? []) listener(snapshot);
}

export function getJob(projectId: string): JobView | null {
  const entry = jobs.get(projectId);
  return entry ? { ...entry.job } : null;
}

export function subscribeJob(projectId: string, listener: Listener): () => void {
  let set = listeners.get(projectId);
  if (!set) {
    set = new Set();
    listeners.set(projectId, set);
  }
  set.add(listener);
  const current = jobs.get(projectId);
  if (current) listener({ ...current.job });
  return () => set.delete(listener);
}

export function cancelJob(projectId: string) {
  const entry = jobs.get(projectId);
  if (!entry || entry.job.done) return;
  entry.abort.abort();
  entry.job.cancelled = true;
  entry.job.phase = "Cancelled";
  entry.job.done = true;
  emit(projectId);
}

export function startJob(
  projectId: string,
  run: (ctx: {
    signal: AbortSignal;
    report: (update: { phase?: string; token?: string; reset?: boolean }) => void;
  }) => Promise<void>,
) {
  const previous = jobs.get(projectId);
  if (previous && !previous.job.done) previous.abort.abort();
  const abort = new AbortController();
  const entry: Entry = {
    abort,
    job: { projectId, phase: "Starting", output: "", error: "", done: false, cancelled: false },
  };
  jobs.set(projectId, entry);
  const report = (update: { phase?: string; token?: string; reset?: boolean }) => {
    if (jobs.get(projectId) !== entry) return;
    if (update.reset) entry.job.output = "";
    if (update.phase) entry.job.phase = update.phase;
    if (update.token) entry.job.output += update.token;
    emit(projectId);
  };
  emit(projectId);
  void run({ signal: abort.signal, report })
    .then(() => {
      if (jobs.get(projectId) !== entry || entry.job.cancelled) return;
      entry.job.done = true;
      if (!entry.job.phase) entry.job.phase = "Saved";
      emit(projectId);
    })
    .catch((error: unknown) => {
      if (jobs.get(projectId) !== entry) return;
      if (abort.signal.aborted) {
        entry.job.cancelled = true;
        entry.job.phase = "Cancelled";
      } else {
        entry.job.error = error instanceof Error ? error.message : String(error);
        entry.job.phase = "Could not finish";
      }
      entry.job.done = true;
      emit(projectId);
    });
}
