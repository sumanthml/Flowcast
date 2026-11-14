import { TuringSimulationResult, TuringMachineStep } from '@/types';

/**
 * Educational Turing Machine Decider:
 * Decides language L = { ▷ 1^s # 1^r ◁ | s <= r }
 * where:
 *   s = usable on-hand inventory count
 *   r = reorder point threshold
 * 
 * Formal 7-Tuple: M = (Q, Σ, Γ, δ, q0, q_accept, q_reject)
 * Tape Alphabet Γ = { '▷', '1', '#', 'X', 'Y', '◁', '␣' }
 * Input Alphabet Σ = { '1', '#' }
 * States Q = { q0_start, q1_scan_stock, q2_scan_rop, q3_rewind, q_accept, q_reject }
 */
export function simulateInventoryDeciderTM(stockCount: number, ropCount: number, maxSteps: number = 80): TuringSimulationResult {
  // Cap inputs for clear visualization trace (e.g. up to 10 units)
  const s = Math.min(Math.max(1, Math.round(stockCount)), 8);
  const r = Math.min(Math.max(1, Math.round(ropCount)), 8);

  // Construct initial tape: [ '▷', ...'1's, '#', ...'1'r, '◁' ]
  const tape: string[] = ['▷'];
  for (let i = 0; i < s; i++) tape.push('1');
  tape.push('#');
  for (let i = 0; i < r; i++) tape.push('1');
  tape.push('◁');

  const initialTapeCopy = [...tape];
  const steps: TuringMachineStep[] = [];

  let currentState = 'q0_start';
  let head = 0;
  let stepCount = 0;

  steps.push({
    stepIndex: 0,
    currentState,
    headPosition: head,
    tapeSnapshot: [...tape],
    actionDescription: `Initialize tape with UsableStock=${s} ('1's) and ROP=${r} ('1's separated by '#'). Head at start marker ▷.`,
  });

  while (currentState !== 'q_accept' && currentState !== 'q_reject' && stepCount < maxSteps) {
    stepCount++;
    const currentSymbol = tape[head] || '␣';

    if (currentState === 'q0_start') {
      if (currentSymbol === '▷') {
        head++;
        currentState = 'q1_match_stock';
        steps.push({
          stepIndex: stepCount,
          currentState,
          headPosition: head,
          tapeSnapshot: [...tape],
          actionDescription: `Read start marker '▷', move Right into stock scanning state.`,
        });
      }
    } else if (currentState === 'q1_match_stock') {
      if (currentSymbol === '1') {
        // Mark stock item as counted
        tape[head] = 'X';
        head++;
        currentState = 'q2_seek_rop_delimiter';
        steps.push({
          stepIndex: stepCount,
          currentState,
          headPosition: head,
          tapeSnapshot: [...tape],
          actionDescription: `Mark stock unit as 'X', move Right across tape seeking '#' separator.`,
        });
      } else if (currentSymbol === 'X') {
        head++;
        // Keep scanning right
      } else if (currentSymbol === '#') {
        // All stock units have been matched! This means s <= r.
        currentState = 'q_accept';
        steps.push({
          stepIndex: stepCount,
          currentState,
          headPosition: head,
          tapeSnapshot: [...tape],
          actionDescription: `Encountered '#' with no remaining unmatched stock! Hence Stock <= ROP. Machine enters ACCEPT state (Reorder Required).`,
        });
      }
    } else if (currentState === 'q2_seek_rop_delimiter') {
      if (currentSymbol === '1' || currentSymbol === 'X') {
        head++;
      } else if (currentSymbol === '#') {
        head++;
        currentState = 'q3_match_rop';
        steps.push({
          stepIndex: stepCount,
          currentState,
          headPosition: head,
          tapeSnapshot: [...tape],
          actionDescription: `Crossed '#' separator. Now finding corresponding ROP unit.`,
        });
      }
    } else if (currentState === 'q3_match_rop') {
      if (currentSymbol === 'Y') {
        head++; // already marked ROP unit, keep looking right
      } else if (currentSymbol === '1') {
        tape[head] = 'Y';
        currentState = 'q4_rewind';
        head--;
        steps.push({
          stepIndex: stepCount,
          currentState,
          headPosition: head,
          tapeSnapshot: [...tape],
          actionDescription: `Matched corresponding ROP unit with 'Y'. Rewinding tape head Left to next stock unit.`,
        });
      } else if (currentSymbol === '◁') {
        // Reached end of tape before finding an unmatched ROP unit!
        // This means Stock > ROP!
        currentState = 'q_reject';
        steps.push({
          stepIndex: stepCount,
          currentState,
          headPosition: head,
          tapeSnapshot: [...tape],
          actionDescription: `Reached end marker '◁' with unmatched stock remaining! Stock exceeds ROP. Machine enters REJECT state (No Order Needed).`,
        });
      }
    } else if (currentState === 'q4_rewind') {
      if (currentSymbol === '▷') {
        head++;
        currentState = 'q1_match_stock';
        steps.push({
          stepIndex: stepCount,
          currentState,
          headPosition: head,
          tapeSnapshot: [...tape],
          actionDescription: `Hit start marker '▷', reversing direction Right to scan next unmatched stock unit.`,
        });
      } else {
        head--;
      }
    }
  }

  return {
    initialTape: initialTapeCopy,
    finalTape: [...tape],
    tapeAlphabet: ['▷', '1', '#', 'X', 'Y', '◁', '␣'],
    totalSteps: steps.length,
    isAccepted: currentState === 'q_accept',
    formalLanguageDefinition: 'L = { ▷ 1^s # 1^r ◁ | s ≤ r } — Formal decision procedure verifying inventory deficit condition.',
    steps,
  };
}
