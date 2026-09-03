import { ARCHITECTURE_GROUPS, FLOWS, PERMISSION_COLUMNS, PHASES, ROLES, STATE_VOCABULARY } from './product-data';
import styles from './product.module.css';

type ArchitectureViewProps = { readonly workspaceName: string };

export function ArchitectureView({ workspaceName }: ArchitectureViewProps) {
  return (
    <section className={styles.architecture}>
      <header className={styles.architectureIntro}>
        <span>Mapa de producto · integración {workspaceName}</span>
        <h2>Arquitectura del panel</h2>
        <p>Command Center, Pipeline y la ficha de deal son una vista del CRM actual. El resto de destinos abre el módulo canónico de {workspaceName}, sin mantener una copia paralela de los datos.</p>
      </header>

      <ArchitectureSection title="Grupos de navegación">
        <div className={styles.architectureGroups}>
          {ARCHITECTURE_GROUPS.map((group) => <article key={group.title}><h3>{group.title}</h3>{group.items.map((item) => <span key={item.label}>{item.label}</span>)}</article>)}
        </div>
      </ArchitectureSection>

      <ArchitectureSection title="Vocabulario de estado">
        <div className={styles.stateVocabulary}>
          {STATE_VOCABULARY.map((item) => <article key={item.label}><i data-tone={item.tone}>{item.label}</i><p>{item.body}</p></article>)}
        </div>
      </ArchitectureSection>

      <ArchitectureSection title="Roles y permisos">
        <div className={styles.permissionScroller}>
          <table><thead><tr><th>Rol</th>{PERMISSION_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>{ROLES.map((role) => <tr key={role.name}><th>{role.name}</th>{role.marks.map((mark, index) => <td data-mark={mark} key={`${role.name}-${PERMISSION_COLUMNS[index]}`}>{mark}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className={styles.permissionLegend}>● Completo · ◐ Solo lo asignado · ○ Lectura · — Sin acceso</p>
      </ArchitectureSection>

      <ArchitectureSection title="Flujos principales">
        <div className={styles.flowGrid}>{FLOWS.map((flow) => <article key={flow.title}><h3>{flow.title}</h3>{flow.steps.map((step, index) => <p key={step}><span>0{index + 1}</span>{step}</p>)}</article>)}</div>
      </ArchitectureSection>

      <ArchitectureSection title="Alcance por fase">
        <div className={styles.phaseGrid}>{PHASES.map((phase) => <article key={phase.title}><span>{phase.tag}</span><h3>{phase.title}</h3><p>{phase.body}</p></article>)}</div>
      </ArchitectureSection>
    </section>
  );
}

function ArchitectureSection({ children, title }: { readonly children: React.ReactNode; readonly title: string }) {
  return <section className={styles.architectureSection}><h2>{title}</h2>{children}</section>;
}
