import type { ReactNode } from 'react';
import { AvatarDot, type PlayerColor } from '../components/AvatarDot';
import { Card } from '../components/Card';
import { Controls } from '../components/Controls';
import { Dock, DockButton } from '../components/Dock';
import { GhostIconButton } from '../components/GhostIconButton';
import { AgainIcon, ArrowIcon, HomeIcon, UndoIcon } from '../components/icons';
import { PillButton } from '../components/PillButton';

/**
 * dev-only sheet of the base components (open with ?kit while running
 * `pnpm dev`). it is never part of a production build.
 */

const colors: PlayerColor[] = ['blue', 'amber', 'red', 'green', 'graphite', 'stone'];
const names = ['ana', 'ben', 'caro', 'dev', 'eli', 'fia', 'gus', 'hal'];

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="py-6">
      <h2 className="meta mb-4">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export default function Kit() {
  return (
    <div className="dot-grid relative min-h-dvh">
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6">
        <Controls />
      </div>
      <main className="mx-auto max-w-[720px] px-6 pt-7 pb-40 sm:px-10 sm:pt-12">
        <h1 className="display text-[30px]">kit</h1>
        <p className="meta mt-2">base components, both themes.</p>

        <Row title="type">
          <div className="space-y-2">
            <p className="display text-[44px]">ana wins</p>
            <p className="text-sm">your turn</p>
            <p className="meta">ana is thinking</p>
            <p className="font-mono text-[13px] tracking-[0.04em]">QBXT · 12 · 07</p>
          </div>
        </Row>

        <Row title="pill button">
          <PillButton>start</PillButton>
          <PillButton variant="quiet">again?</PillButton>
          <PillButton variant="ghost">back to lobby</PillButton>
          <PillButton disabled>start</PillButton>
        </Row>

        <Row title="ghost icon button">
          <GhostIconButton label="home">
            <HomeIcon />
          </GhostIconButton>
          <GhostIconButton label="undo">
            <UndoIcon />
          </GhostIconButton>
          <GhostIconButton label="open">
            <ArrowIcon />
          </GhostIconButton>
          <GhostIconButton label="again" bordered={false}>
            <AgainIcon />
          </GhostIconButton>
        </Row>

        <Row title="avatar dot">
          {names.map((name, i) => (
            <AvatarDot
              key={name}
              name={name}
              color={colors[i % colors.length]!}
              shape={i < colors.length ? 'circle' : 'square'}
            />
          ))}
          <AvatarDot name="ana" color="blue" size="sm" />
          <AvatarDot name="ana" color="blue" size="lg" />
          <AvatarDot name="ben" color="amber" away />
        </Row>

        <Row title="card">
          {(['blue', 'amber', 'red', 'green'] as const).map((accent) => (
            <Card key={accent} accent={accent} lift className="w-40 p-5">
              <span className="size-2 rounded-full bg-accent inline-block" />
              <p className="mt-6 text-[15px] font-medium tracking-[-0.01em]">{accent}</p>
              <p className="meta">one accent.</p>
            </Card>
          ))}
        </Row>

        <Row title="room code">
          <Card className="w-full px-8 py-10 text-center">
            <p className="display text-[56px] tracking-[0.04em]">QBXT</p>
            <p className="meta mt-3">waiting for the others...</p>
            <div className="mt-6 flex justify-center gap-2">
              {names.slice(0, 4).map((name, i) => (
                <AvatarDot key={name} name={name} color={colors[i]!} />
              ))}
            </div>
          </Card>
        </Row>
      </main>

      <Dock label="game actions">
        <DockButton label="home">
          <HomeIcon />
        </DockButton>
        <DockButton label="undo">
          <UndoIcon />
        </DockButton>
        <DockButton label="again">
          <AgainIcon />
        </DockButton>
      </Dock>
    </div>
  );
}
