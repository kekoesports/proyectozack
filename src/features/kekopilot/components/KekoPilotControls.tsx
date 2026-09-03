'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { AgentCopy, SolutionCopy } from '../content';
import styles from '../kekopilot-controls.module.css';

const SIGNAL_MATRIX_CELLS = Array.from({ length: 24 }, (_, index) => index);

type AgentConsoleProps = {
  readonly labels: {
    readonly capability: string;
    readonly input: string;
    readonly output: string;
    readonly guardrail: string;
    readonly activity: string;
  };
  readonly agents: ReadonlyArray<AgentCopy>;
};

export function AgentConsole({ labels, agents }: AgentConsoleProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeAgent = agents[activeIndex] ?? agents[0];

  if (!activeAgent) return null;

  const moveTabFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + agents.length) % agents.length;
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className={styles.agentConsole}>
      <div className={styles.agentTabs} role="tablist" aria-label={labels.capability} aria-orientation="vertical">
        {agents.map((agent, index) => (
          <button
            aria-controls="kp-agent-panel"
            aria-selected={activeIndex === index}
            className={styles.agentTab}
            data-kp-cursor
            id={`kp-agent-tab-${index}`}
            key={agent.code}
            onClick={() => setActiveIndex(index)}
            onKeyDown={(event) => moveTabFocus(event, index)}
            ref={(node) => { tabRefs.current[index] = node; }}
            role="tab"
            tabIndex={activeIndex === index ? 0 : -1}
            type="button"
          >
            <span>{agent.code}</span>
            <strong>{agent.name}</strong>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`kp-agent-tab-${activeIndex}`}
        className={styles.agentPanel}
        id="kp-agent-panel"
        key={activeAgent.code}
        role="tabpanel"
        tabIndex={0}
      >
        <div className={styles.panelHeader}>
          <span>{activeAgent.code}</span>
          <span><i aria-hidden="true" /> Private beta</span>
        </div>
        <div className={styles.panelBody}>
          <span>{labels.capability}</span>
          <h3>{activeAgent.name}</h3>
          <p>{activeAgent.summary}</p>
          <dl>
            <div><dt>{labels.input}</dt><dd>{activeAgent.input}</dd></div>
            <div><dt>{labels.output}</dt><dd>{activeAgent.output}</dd></div>
            <div><dt>{labels.guardrail}</dt><dd>{activeAgent.guardrail}</dd></div>
          </dl>
        </div>
        <div className={styles.activityLog}>
          <span>{labels.activity}</span>
          <p><i aria-hidden="true" />{activeAgent.event}</p>
          <div aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>
        </div>
      </div>
    </div>
  );
}

type SolutionsConsoleProps = {
  readonly items: ReadonlyArray<SolutionCopy>;
};

export function SolutionsConsole({ items }: SolutionsConsoleProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = items[activeIndex] ?? items[0];

  if (!active) return null;

  return (
    <div className={styles.solutionsConsole}>
      <div className={styles.solutionTabs} aria-label="Audience" role="group">
        {items.map((item, index) => (
          <button
            aria-pressed={activeIndex === index}
            data-kp-cursor
            key={item.label}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <span>0{index + 1}</span>{item.label}
          </button>
        ))}
      </div>
      <div className={styles.solutionPanel} key={active.label}>
        <span><i aria-hidden="true" />{active.signal}</span>
        <h3>{active.title}</h3>
        <p>{active.body}</p>
        <div className={styles.signalMatrix} aria-hidden="true">
          {SIGNAL_MATRIX_CELLS.map((index) => <i key={index} />)}
        </div>
      </div>
    </div>
  );
}
