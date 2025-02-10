import { createContext, useContext, ParentProps, createMemo, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import { AudioEncoding, AudioUnitSpec, ResolvedFieldDef, UmweltDataset, UmweltSpec, UmweltValue } from '../../types';
import { LogicalAnd } from 'vega-lite/src/logical';
import { getFieldDef, resolveFieldDef } from '../../util/spec';
import { serializeValue } from '../../util/values';
import { selectionTest } from '../../util/selection';
import { FieldEqualPredicate, FieldRangePredicate } from 'vega-lite/src/predicate';
import { getBinnedDomain, getDomain } from '../../util/domain';
import fastCartesian from 'fast-cartesian';
import { DEFAULT_TONE_BPM, SonifierNote, useAudioEngine } from './AudioEngineContext';
import { useSonificationState } from './SonificationStateContext';
import { encodeProperty } from '../../util/encoding';
import { useAudioScales } from './AudioScalesContext';
import { derivedDataset, derivedFieldName, derivedFieldNameBinStartEnd } from '../../util/transforms';
import { describeField, fmtValue, makeCommaSeparatedString } from '../../util/description';
import { useUmweltSelection } from '../UmweltSelectionContext';

export interface EncodedNote {
  duration: number; // duration in seconds
  pitch: number | undefined; // midi, or undefined for noise
  volume: number; // decibels
}

export type AudioUnitStateProviderProps = ParentProps<{
  spec: UmweltSpec;
  audioUnitSpec: AudioUnitSpec;
}>;

export type AudioUnitStateActions = {
  setTraversalIndex: (field: string, index: number) => void;
  getTraversalIndex: (field: string) => number;
  getFieldDomains: () => Record<string, UmweltValue[]>;
  getDerivedData: () => UmweltDataset;
  getDomainValue: (field: string, idx: number) => UmweltValue | [UmweltValue, UmweltValue];
  setupTransportSequence: () => void;
  resetTraversalIfEnd: () => void;
  describeEncodings: () => string;
  describePlaybackOrder: () => string;
};

type AudioUnitStateInternalActions = {
  traversalStateToData: (state: TraversalState) => UmweltDataset;
  encodeDataAsNote: (data: UmweltDataset, encoding: AudioEncoding) => EncodedNote;
  countEndingSectionsOfState: (state: TraversalState) => number;
  getNoteFromState: (state: TraversalState) => SonifierNote | undefined;
};

export type TraversalState = Record<string, number>; // Field -> Index

export interface AudioUnitState {
  traversalState: TraversalState;
}

const AudioUnitStateContext = createContext<[AudioUnitState, AudioUnitStateActions]>();

export function AudioUnitStateProvider(props: AudioUnitStateProviderProps) {
  const [_, umweltSelectionActions] = useUmweltSelection();
  const [scales, scaleActions] = useAudioScales();
  const [sonificationState, sonificationStateActions] = useSonificationState();
  const [audioEngine, audioEngineActions] = useAudioEngine();

  const getInitialState = (): AudioUnitState => {
    return {
      traversalState: Object.fromEntries(
        props.audioUnitSpec.traversal.map((traversalFieldDef) => {
          return [traversalFieldDef.field, 0];
        })
      ),
    };
  };

  createEffect(() => {
    // update umwelt selection when audio is playing
    if (audioEngine.isPlaying) {
      const predicate = getPredicateForState();
      umweltSelectionActions.setSelection({ source: 'sonification', predicate });
    }
  });

  createEffect((prev?: Record<string, UmweltValue[]>) => {
    // when sonification selection changes, update traversal state and transport
    const domains = getFieldDomains();
    const currentTraversalState = { ...audioUnitState.traversalState };
    let needsUpdate = false;
    const newTraversalState = { ...currentTraversalState };

    Object.entries(domains).forEach(([field, domain]) => {
      const currentIndex = currentTraversalState[field];
      const prevDomain = prev?.[field] ?? domain;
      const oldValue = prevDomain[currentIndex];

      if (oldValue !== undefined) {
        const newIndex = domain.findIndex((value) => value === oldValue);
        if (newIndex !== currentIndex) {
          newTraversalState[field] = newIndex !== -1 ? newIndex : 0;
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) {
      setAudioUnitState((prev) => ({
        ...prev,
        traversalState: newTraversalState,
      }));

      if (sonificationState.activeUnitName === props.audioUnitSpec.name) {
        actions.setupTransportSequence();
      }
    }

    return domains;
  });

  createEffect((prev) => {
    // when props update setup transport
    if (prev !== props.audioUnitSpec) {
      actions.setupTransportSequence();
    }

    return props.audioUnitSpec;
  });

  const [audioUnitState, setAudioUnitState] = createStore(getInitialState());

  // derived state
  const getResolvedFields = createMemo(() => {
    return props.spec.fields.map((fieldDef) => {
      const encFieldDef = Object.values(props.audioUnitSpec.encoding).find((f) => f.field === fieldDef.name) || props.audioUnitSpec.traversal.find((f) => f.field === fieldDef.name);
      return resolveFieldDef(fieldDef, encFieldDef);
    });
  });
  const getDerivedData = createMemo(() => {
    const data = sonificationState.selection ? selectionTest(props.spec.data.values, sonificationState.selection) : props.spec.data.values;
    const derived = derivedDataset(data, getResolvedFields()); // TODO global selection
    return derived;
  });
  const getFieldDomains = createMemo(() => {
    return Object.fromEntries(
      props.audioUnitSpec.traversal.map((traversalFieldDef) => {
        const fieldDef = getFieldDef(props.spec, traversalFieldDef.field)!;
        const resolvedFieldDef = resolveFieldDef(fieldDef, traversalFieldDef);
        const domain = getDomain(resolvedFieldDef, getDerivedData(), true);
        return [traversalFieldDef.field, domain];
      })
    );
  });
  const getAxisTicks = createMemo(() => {
    return Object.fromEntries(
      props.audioUnitSpec.traversal.map((traversalFieldDef) => {
        const fieldDef = getFieldDef(props.spec, traversalFieldDef.field)!;
        const resolvedFieldDef = resolveFieldDef(fieldDef, traversalFieldDef);
        return [traversalFieldDef.field, scaleActions.getAxisTicks(resolvedFieldDef)];
      })
    );
  });
  const getDomainValue = (field: string, idx: number): UmweltValue | [UmweltValue, UmweltValue] => {
    const fieldDef = getFieldDef(props.spec, field)!;
    const resolvedFieldDef = resolveFieldDef(fieldDef, props.audioUnitSpec.traversal.find((f) => f.field === field)!);
    const domain = getFieldDomains()[field];
    if (resolvedFieldDef.bin && !resolvedFieldDef.aggregate) {
      const [startField, endField] = derivedFieldNameBinStartEnd(resolvedFieldDef);
      const startValue = domain[idx];
      const endValue = getDerivedData().find((d) => d[startField] === startValue)![endField];
      return [startValue, endValue];
    } else {
      return domain[idx];
    }
  };
  const getPredicateForState = createMemo(() => {
    return {
      and: Object.entries(audioUnitState.traversalState).map(([field, idx]) => {
        const value = getDomainValue(field, idx);
        const lastIndex = getFieldDomains()[field].length - 1;
        if (Array.isArray(value)) {
          return {
            field,
            range: value,
            inclusive: idx === lastIndex,
          } as FieldRangePredicate;
        } else {
          return {
            field,
            equal: value,
          } as FieldEqualPredicate;
        }
      }),
    };
  });

  const actions: AudioUnitStateActions = {
    setTraversalIndex: (field, index) => {
      audioEngineActions.stopTransport();
      setAudioUnitState((prev) => {
        return { ...prev, traversalState: { ...prev.traversalState, [field]: index } };
      });
      if (sonificationState.activeUnitName === props.audioUnitSpec.name) {
        sonificationStateActions.setActiveUnit(props.audioUnitSpec.name);
        actions.setupTransportSequence();
      }
      // update umwelt selection
      const predicate = getPredicateForState();
      umweltSelectionActions.setSelection({ source: 'sonification', predicate });
      // play note
      const note = internalActions.getNoteFromState(audioUnitState.traversalState);
      if (note) {
        audioEngine.transport.seconds = note?.time;
        audioEngineActions.playNote(note);
      }
    },
    getTraversalIndex: (field) => {
      return audioUnitState.traversalState[field];
    },
    setupTransportSequence: () => {
      console.log('Setting up transport sequence');
      // Clear previous sequence
      audioEngine.transport.cancel();

      // timing is relative to bpm at time of scheduling, so set it to default
      // and then set it to the scaled value after scheduling
      audioEngine.transport.bpm.value = DEFAULT_TONE_BPM;

      const notes = getSonifierNotes();

      // Schedule notes in the transport
      notes.forEach((note, idx) => {
        // if note.state is the same as the current traversal state, set the time to the note time
        if (Object.entries(note.state).every(([field, index]) => audioUnitState.traversalState[field] === index)) {
          audioEngine.transport.seconds = note.time;
        }

        audioEngine.transport.schedule(() => {
          if (audioEngine.isPlaying) {
            // isPlaying check needed to avoid race conditions because of async scheduling

            setAudioUnitState((prev) => {
              return { ...prev, traversalState: note.state };
            });

            if (note.speakBefore && audioEngine.speakAxisTicks && !audioEngine.muted) {
              audioEngine.transport.pause();
              audioEngineActions.releaseSynth();
              speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(note.speakBefore);
              utterance.rate = audioEngine.speechRate / 25;
              utterance.onend = () => {
                if (audioEngine.isPlaying) {
                  // play note
                  if (note.ramp) {
                    audioEngineActions.startOrRampSynth(note);
                  } else {
                    audioEngineActions.playNote(note);
                  }
                  audioEngine.transport.start();
                }
              };
              speechSynthesis.speak(utterance);
            } else {
              if (note.ramp) {
                audioEngineActions.startOrRampSynth(note);
              } else {
                audioEngineActions.playNote(note);
              }
            }
          }
        }, note.time);
        if (note.pauseAfter) {
          audioEngine.transport.schedule(() => {
            audioEngineActions.releaseSynth();
          }, note.time + note.duration);
        }
        // if it's the last note, pause the transport
        if (idx === notes.length - 1) {
          audioEngine.transport.schedule(() => {
            audioEngineActions.stopTransport();
          }, note.time + note.duration);
        }
      });

      audioEngine.transport.bpm.value = DEFAULT_TONE_BPM * audioEngine.playbackRate;
    },
    getFieldDomains,
    getDerivedData,
    resetTraversalIfEnd: () => {
      const traversalFields = props.audioUnitSpec.traversal.map((f) => f.field);
      const traversalState = audioUnitState.traversalState;
      const traversalEnd = traversalFields.every((field) => {
        return traversalState[field] === getFieldDomains()[field].length - 1;
      });
      if (traversalEnd) {
        setAudioUnitState(getInitialState());
        audioEngine.transport.seconds = 0;
      }
    },
    getDomainValue,
    describeEncodings: () => {
      return makeCommaSeparatedString(
        Object.entries(props.audioUnitSpec.encoding)
          .map(([propName, encoding]) => {
            if (encoding) {
              return `${describeField(resolveFieldDef(getFieldDef(props.spec, encoding.field)!, encoding))} as ${propName}`;
            }
            return '';
          })
          .filter((x) => x)
      );
    },
    describePlaybackOrder: () => {
      if (!props.audioUnitSpec.traversal.length) {
        return '';
      }

      const innerTraversal = props.audioUnitSpec.traversal[props.audioUnitSpec.traversal.length - 1];
      const fieldDef = getFieldDef(props.spec, innerTraversal.field);
      const resolvedDef = resolveFieldDef(fieldDef!, innerTraversal);

      let domain;
      if (resolvedDef.bin) {
        domain = getBinnedDomain(resolvedDef, getDerivedData());
      } else {
        const domains = getFieldDomains();
        domain = domains[innerTraversal.field];
      }

      let label = '';

      if (domain.length > 1) {
        label = `${describeField(resolvedDef)} from ${fmtValue(domain[0], resolvedDef)} to ${fmtValue(domain[domain.length - 1], resolvedDef)}`;
      } else if (domain.length === 1) {
        label = `${describeField(resolvedDef)} equals ${fmtValue(domain[0], resolvedDef)}`;
      } else {
        label = describeField(resolvedDef);
      }

      const additionalFields = props.audioUnitSpec.traversal.slice(0, -1).map((t) => {
        const fieldDef = getFieldDef(props.spec, t.field);
        return describeField(resolveFieldDef(fieldDef!, t));
      });

      if (additionalFields.length) {
        label += ` for each ${makeCommaSeparatedString(additionalFields)}`;
      }

      return label;
    },
  };

  const internalActions: AudioUnitStateInternalActions = {
    traversalStateToData: (traversalState: TraversalState) => {
      const predicate: LogicalAnd<FieldEqualPredicate> = {
        and: Object.entries(traversalState).map(([field, index]) => {
          const value = getFieldDomains()[field][index];
          const fieldDef = getFieldDef(props.spec, field);
          if (!fieldDef) {
            return {
              field,
              equal: value,
            };
          }
          const resolvedFieldDef = resolveFieldDef(fieldDef, props.audioUnitSpec.traversal.find((f) => f.field === field)!);
          const derivedField = derivedFieldName(resolvedFieldDef);
          return {
            field: derivedField,
            equal: serializeValue(value, fieldDef),
          };
        }),
      };
      const selection = selectionTest(getDerivedData(), predicate);
      return selection;
    },
    encodeDataAsNote: (data: UmweltDataset, encoding: AudioEncoding): EncodedNote => {
      const note = {
        pitch: data.length ? encodeProperty('pitch', props.spec, encoding.pitch, scales.pitch, data) : undefined,
        volume: encodeProperty('volume', props.spec, encoding.volume, scales.volume, data),
        duration: encodeProperty('duration', props.spec, encoding.duration, scales.duration, data),
      };
      return note;
    },
    countEndingSectionsOfState: (state: TraversalState) => {
      const ends = Object.entries(state)
        .map(([field, index]) => {
          return index === getFieldDomains()[field].length - 1 ? 1 : 0;
        })
        .reverse();
      let endCount = 0;
      for (let x of ends) {
        if (x) {
          endCount++;
        } else break;
      }
      return endCount;
    },
    getNoteFromState: (state: TraversalState) => {
      const notes = getSonifierNotes();
      const note = notes.find((note) => {
        return Object.entries(state).every(([field, index]) => {
          return note.state[field] === index;
        });
      });
      return note;
    },
  };

  const shouldRamp = createMemo(() => {
    const innermostField = props.audioUnitSpec.traversal[props.audioUnitSpec.traversal.length - 1].field;
    const fieldDef = getFieldDef(props.spec, innermostField);
    return fieldDef?.type === 'quantitative' || fieldDef?.type === 'temporal';
  });

  const getAllTraversalStates = createMemo(() => {
    const traversalFields = [...props.audioUnitSpec.traversal.map((f) => f.field)];
    const fieldDomains = getFieldDomains();

    const domainLengths = traversalFields.map((field) => Array.from({ length: fieldDomains[field].length }, (_, i) => i));

    // Generate all combinations of indices using fastCartesian
    const indexCombinations = fastCartesian(domainLengths);

    // Convert index combinations to field combinations
    return indexCombinations.map((combination) => {
      const result: TraversalState = {};
      combination.forEach((index, fieldIndex) => {
        result[traversalFields[fieldIndex]] = index;
      });
      return result;
    });
  });
  const getAnnouncementForNote = (state: TraversalState, prevState?: TraversalState) => {
    const announcement: string[] = [];
    Object.entries(state).forEach(([field, stateIdx]) => {
      const domain = getFieldDomains()[field];

      if (!domain.length) return;

      const fieldDef = getFieldDef(props.spec, field)!;
      const resolvedDef = resolveFieldDef(fieldDef, props.audioUnitSpec.traversal.find((f) => f.field === field)!);

      const shouldAnnounce = hasCrossedAxisTick(state, prevState, resolvedDef);

      if (shouldAnnounce) {
        announcement.push(fmtValue(actions.getDomainValue(field, state[field]), resolvedDef));
      }
    });

    return announcement.join(', ');
  };
  const hasCrossedAxisTick = (state: TraversalState, prevState: TraversalState | undefined, resolvedDef: ResolvedFieldDef) => {
    let domain;
    if (resolvedDef.bin || resolvedDef.type === 'nominal' || resolvedDef.type === 'ordinal') {
      // either already binned or is a nominal/ordinal field (no binning)
      domain = getFieldDomains()[resolvedDef.field];
    } else {
      domain = getAxisTicks()[resolvedDef.field];
    }

    if (!prevState) {
      // first state
      return true;
    }

    const currentData = internalActions.traversalStateToData(state);
    const prevData = internalActions.traversalStateToData(prevState);

    if (currentData.length && prevData.length) {
      const fieldName = derivedFieldName(resolvedDef);
      const currentValue = currentData[0][fieldName];
      const prevValue = prevData[0][fieldName];

      if (currentValue && prevValue) {
        const currentTickIdx = domain.findIndex((tick, idx) => {
          const v = tick instanceof Date ? tick.getTime() : tick;
          const nextTick = domain[idx + 1];
          const v2 = nextTick instanceof Date ? nextTick.getTime() : nextTick;
          return v && currentValue >= v && currentValue < (v2 || Infinity);
        });
        const prevTickIdx = domain.findIndex((tick, idx) => {
          const v = tick instanceof Date ? tick.getTime() : tick;
          const nextTick = domain[idx + 1];
          const v2 = nextTick instanceof Date ? nextTick.getTime() : nextTick;
          return v && prevValue >= v && prevValue < (v2 || Infinity);
        });

        return currentTickIdx !== prevTickIdx;
      }
    }

    return false;
  };
  const getSonifierNotes = createMemo(() => {
    // Set up new sequence based on all possible states
    let currentTime = 0;
    const notes: SonifierNote[] = [];

    const allTraversalStates = getAllTraversalStates();

    let prevState: TraversalState | undefined = undefined;
    allTraversalStates.forEach((state) => {
      const data = internalActions.traversalStateToData(state);
      const note = internalActions.encodeDataAsNote(data, props.audioUnitSpec.encoding);

      // Add section breaks if this state ends one or more sections
      const endingSections = internalActions.countEndingSectionsOfState(state);
      const pauseAfter = audioEngine.pauseBetweenSections * endingSections;

      // Add the note with cumulative timing
      notes.push({
        ...note,
        time: currentTime,
        pauseAfter,
        ramp: shouldRamp(),
        state,
        speakBefore: getAnnouncementForNote(state, prevState),
      });

      // Update the time for the next note, including the gap
      currentTime += note.duration + pauseAfter;

      prevState = state;
    });

    return notes;
  });

  return <AudioUnitStateContext.Provider value={[audioUnitState, actions]}>{props.children}</AudioUnitStateContext.Provider>;
}

export function useAudioUnitState() {
  const context = useContext(AudioUnitStateContext);
  if (context === undefined) {
    throw new Error('useAudioUnitState must be used within a AudioUnitStateProvider');
  }
  return context;
}
