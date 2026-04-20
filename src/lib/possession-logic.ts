import type {
  ContextAction,
  DriveLane,
  DriveResult,
  HelpState,
  Marker,
  MarkerType,
  PassTarget,
  PendingFlow,
  PossessionChain,
  PossessionStep,
  RootAction,
  ShotResult,
} from "@/lib/possession-types";

function createId() {
  return crypto.randomUUID();
}

function rootToMarkerType(action: RootAction): MarkerType {
  switch (action) {
    case "catch":
      return "catch";
    case "drive":
      return "drive";
    case "pass":
      return "pass";
    case "shot":
      return "shot";
    case "turnover":
      return "turnover";
    case "reset":
      return "reset";
    case "foul":
      return "foul";
    default:
      return "reset";
  }
}

function makeStep(input: {
  type: PossessionStep["type"];
  label: string;
  timeSec: number;
  parentId?: string | null;
  nextId?: string | null;
  meta?: PossessionStep["meta"];
}): PossessionStep {
  return {
    id: createId(),
    type: input.type,
    label: input.label,
    timeSec: input.timeSec,
    parentId: input.parentId ?? null,
    nextId: input.nextId ?? null,
    meta: input.meta,
  };
}

function appendStepToChain(
  chain: PossessionChain,
  step: PossessionStep,
  attachToId?: string | null
): PossessionChain {
  const targetParentId =
    attachToId ?? chain.steps[chain.steps.length - 1]?.id ?? null;

  const nextSteps = chain.steps.map((existing) =>
    existing.id === targetParentId ? { ...existing, nextId: step.id } : existing
  );

  return {
    ...chain,
    steps: [...nextSteps, { ...step, parentId: targetParentId }],
  };
}

function closeChain(chain: PossessionChain): PossessionChain {
  return { ...chain, closed: true };
}

function findChain(
  chains: PossessionChain[],
  possessionId: string
): PossessionChain | null {
  return chains.find((chain) => chain.id === possessionId) ?? null;
}

function replaceChain(
  chains: PossessionChain[],
  updated: PossessionChain
): PossessionChain[] {
  return chains.map((chain) => (chain.id === updated.id ? updated : chain));
}

export function createRootAction(input: {
  rootAction: RootAction;
  timeSec: number;
}): {
  chains: PossessionChain[];
  markers: Marker[];
  pendingFlow: PendingFlow;
  selectedMarkerId: string;
  selectedPossessionId: string;
} {
  const chainId = createId();

  const rootStep = makeStep({
    type: input.rootAction,
    label: input.rootAction.toUpperCase(),
    timeSec: input.timeSec,
    parentId: null,
  });

  const chain: PossessionChain = {
    id: chainId,
    startedAtSec: input.timeSec,
    rootAction: input.rootAction,
    steps: [rootStep],
    closed:
      input.rootAction === "turnover" ||
      input.rootAction === "reset" ||
      input.rootAction === "foul",
  };

  const marker: Marker = {
    id: createId(),
    type: rootToMarkerType(input.rootAction),
    timeSec: input.timeSec,
    possessionId: chainId,
    stepId: rootStep.id,
  };

  let pendingFlow: PendingFlow = null;

  if (input.rootAction === "drive") {
    pendingFlow = {
      kind: "drive",
      possessionId: chainId,
      lastStepId: rootStep.id,
    };
  } else if (input.rootAction === "pass") {
    pendingFlow = {
      kind: "pass",
      possessionId: chainId,
      lastStepId: rootStep.id,
    };
  } else if (input.rootAction === "shot") {
    pendingFlow = {
      kind: "shot",
      possessionId: chainId,
      lastStepId: rootStep.id,
    };
  }

  return {
    chains: [chain],
    markers: [marker],
    pendingFlow,
    selectedMarkerId: marker.id,
    selectedPossessionId: chainId,
  };
}

export function addRootActionToState(input: {
  chains: PossessionChain[];
  markers: Marker[];
  rootAction: RootAction;
  timeSec: number;
}): {
  chains: PossessionChain[];
  markers: Marker[];
  pendingFlow: PendingFlow;
  selectedMarkerId: string;
  selectedPossessionId: string;
} {
  const created = createRootAction({
    rootAction: input.rootAction,
    timeSec: input.timeSec,
  });

  return {
    chains: [...input.chains, ...created.chains],
    markers: [...input.markers, ...created.markers].sort(
      (a, b) => a.timeSec - b.timeSec
    ),
    pendingFlow: created.pendingFlow,
    selectedMarkerId: created.selectedMarkerId,
    selectedPossessionId: created.selectedPossessionId,
  };
}

export function applyContextAction(input: {
  chains: PossessionChain[];
  markers: Marker[];
  pendingFlow: PendingFlow;
  action: ContextAction;
  timeSec: number;
}): {
  chains: PossessionChain[];
  markers: Marker[];
  pendingFlow: PendingFlow;
  selectedPossessionId: string | null;
} {
  const { pendingFlow, action, timeSec } = input;

  if (!pendingFlow) {
    return {
      chains: input.chains,
      markers: input.markers,
      pendingFlow: null,
      selectedPossessionId: null,
    };
  }

  const chain = findChain(input.chains, pendingFlow.possessionId);

  if (!chain) {
    return {
      chains: input.chains,
      markers: input.markers,
      pendingFlow: null,
      selectedPossessionId: null,
    };
  }

  let updatedChain = chain;
  let nextPending: PendingFlow = pendingFlow;
  const nextMarkers = [...input.markers];

  if (pendingFlow.kind === "drive") {
    if (action === "drive_downhill_yes" || action === "drive_downhill_no") {
      const downhill = action === "drive_downhill_yes";

      const step = makeStep({
        type: "drive_downhill",
        label: downhill ? "DOWNHILL" : "NOT DOWNHILL",
        timeSec,
        meta: { downhill },
      });

      updatedChain = appendStepToChain(updatedChain, step, pendingFlow.lastStepId);

      nextPending = {
        ...pendingFlow,
        lastStepId: step.id,
        downhill,
      };
    }

    else if (
      action === "drive_lane_left" ||
      action === "drive_lane_middle" ||
      action === "drive_lane_right"
    ) {
      const lane: DriveLane =
        action === "drive_lane_left"
          ? "left"
          : action === "drive_lane_middle"
            ? "middle"
            : "right";

      const step = makeStep({
        type: "drive_lane",
        label: lane.toUpperCase(),
        timeSec,
        meta: { lane },
      });

      updatedChain = appendStepToChain(updatedChain, step, pendingFlow.lastStepId);

      nextPending = {
        ...pendingFlow,
        lastStepId: step.id,
        lane,
      };
    }

    else if (action === "drive_help_yes" || action === "drive_help_no") {
      const help: HelpState = action === "drive_help_yes" ? "help" : "no_help";

      const step = makeStep({
        type: "drive_help",
        label: help === "help" ? "HELP" : "NO HELP",
        timeSec,
        meta: { help },
      });

      updatedChain = appendStepToChain(updatedChain, step, pendingFlow.lastStepId);

      nextPending = {
        ...pendingFlow,
        lastStepId: step.id,
        help,
      };
    }

    else if (
      action === "drive_result_finish" ||
      action === "drive_result_pass" ||
      action === "drive_result_pull_up" ||
      action === "drive_result_foul" ||
      action === "drive_result_turnover" ||
      action === "drive_result_reset"
    ) {
      const driveResult: DriveResult =
        action === "drive_result_finish"
          ? "finish"
          : action === "drive_result_pass"
            ? "pass"
            : action === "drive_result_pull_up"
              ? "pull_up"
              : action === "drive_result_foul"
                ? "foul"
                : action === "drive_result_turnover"
                  ? "turnover"
                  : "reset";

      const labelMap: Record<DriveResult, string> = {
        finish: "FINISH",
        pass: "PASS",
        pull_up: "PULL-UP",
        foul: "FOUL",
        turnover: "TURNOVER",
        reset: "RESET",
      };

      const step = makeStep({
        type: "drive_result",
        label: labelMap[driveResult],
        timeSec,
        meta: {
          downhill: pendingFlow.downhill,
          lane: pendingFlow.lane,
          help: pendingFlow.help,
          driveResult,
        },
      });

      updatedChain = appendStepToChain(updatedChain, step, pendingFlow.lastStepId);

      if (driveResult === "pass") {
        const passStep = makeStep({
          type: "pass",
          label: "PASS",
          timeSec,
        });

        updatedChain = appendStepToChain(updatedChain, passStep, step.id);

        const marker: Marker = {
          id: createId(),
          type: "pass",
          timeSec,
          possessionId: updatedChain.id,
          stepId: passStep.id,
        };

        nextMarkers.push(marker);

        nextPending = {
          kind: "pass",
          possessionId: updatedChain.id,
          lastStepId: passStep.id,
        };
      } else if (driveResult === "pull_up") {
        const shotStep = makeStep({
          type: "shot",
          label: "SHOT",
          timeSec,
        });

        updatedChain = appendStepToChain(updatedChain, shotStep, step.id);

        const marker: Marker = {
          id: createId(),
          type: "shot",
          timeSec,
          possessionId: updatedChain.id,
          stepId: shotStep.id,
        };

        nextMarkers.push(marker);

        nextPending = {
          kind: "shot",
          possessionId: updatedChain.id,
          lastStepId: shotStep.id,
        };
      } else if (
        driveResult === "finish" ||
        driveResult === "foul" ||
        driveResult === "turnover" ||
        driveResult === "reset"
      ) {
        updatedChain = closeChain(updatedChain);
        nextPending = null;
      }
    }
  }

  else if (pendingFlow.kind === "pass") {
    if (
      action === "pass_target_left" ||
      action === "pass_target_middle" ||
      action === "pass_target_right"
    ) {
      const passTarget: PassTarget =
        action === "pass_target_left"
          ? "left"
          : action === "pass_target_middle"
            ? "middle"
            : "right";

      const step = makeStep({
        type: "pass_target",
        label: `TO ${passTarget.toUpperCase()}`,
        timeSec,
        meta: { passTarget },
      });

      updatedChain = appendStepToChain(updatedChain, step, pendingFlow.lastStepId);

      nextPending = null;
    }
  }

  else if (pendingFlow.kind === "shot") {
    if (
      action === "shot_result_make" ||
      action === "shot_result_miss" ||
      action === "shot_result_blocked"
    ) {
      const shotResult: ShotResult =
        action === "shot_result_make"
          ? "make"
          : action === "shot_result_miss"
            ? "miss"
            : "blocked";

      const labelMap: Record<ShotResult, string> = {
        make: "MAKE",
        miss: "MISS",
        blocked: "BLOCKED",
      };

      const step = makeStep({
        type: "shot_result",
        label: labelMap[shotResult],
        timeSec,
        meta: { shotResult },
      });

      updatedChain = appendStepToChain(updatedChain, step, pendingFlow.lastStepId);
      updatedChain = closeChain(updatedChain);
      nextPending = null;
    }
  }

  return {
    chains: replaceChain(input.chains, updatedChain),
    markers: nextMarkers.sort((a, b) => a.timeSec - b.timeSec),
    pendingFlow: nextPending,
    selectedPossessionId: updatedChain.id,
  };
}

export function getContextButtons(pendingFlow: PendingFlow): Array<{
  key: ContextAction;
  label: string;
}> {
  if (!pendingFlow) return [];

  if (pendingFlow.kind === "drive") {
    const buttons: Array<{ key: ContextAction; label: string }> = [];

    if (typeof pendingFlow.downhill === "undefined") {
      buttons.push(
        { key: "drive_downhill_yes", label: "Downhill" },
        { key: "drive_downhill_no", label: "Not Downhill" }
      );
      return buttons;
    }

    if (!pendingFlow.lane) {
      buttons.push(
        { key: "drive_lane_left", label: "Left" },
        { key: "drive_lane_middle", label: "Middle" },
        { key: "drive_lane_right", label: "Right" }
      );
      return buttons;
    }

    if (!pendingFlow.help) {
      buttons.push(
        { key: "drive_help_yes", label: "Help" },
        { key: "drive_help_no", label: "No Help" }
      );
      return buttons;
    }

    buttons.push(
      { key: "drive_result_finish", label: "Finish" },
      { key: "drive_result_pass", label: "Pass" },
      { key: "drive_result_pull_up", label: "Pull-up" },
      { key: "drive_result_foul", label: "Foul" },
      { key: "drive_result_turnover", label: "Turnover" },
      { key: "drive_result_reset", label: "Reset" }
    );

    return buttons;
  }

  if (pendingFlow.kind === "pass") {
    return [
      { key: "pass_target_left", label: "To Left" },
      { key: "pass_target_middle", label: "To Middle" },
      { key: "pass_target_right", label: "To Right" },
    ];
  }

  if (pendingFlow.kind === "shot") {
    return [
      { key: "shot_result_make", label: "Make" },
      { key: "shot_result_miss", label: "Miss" },
      { key: "shot_result_blocked", label: "Blocked" },
    ];
  }

  return [];
}