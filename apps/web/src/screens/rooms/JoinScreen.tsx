import { useRef, useState, type FormEvent } from 'react';
import { normalizeCode } from '@lull/game-logic';
import { PillButton } from '../../components/PillButton';
import { TextField } from '../../components/TextField';
import { copy } from '../../copy';
import { savedName, saveName } from '../../lib/identity';
import { nudge } from '../../lib/nudge';
import { navigate } from '../../lib/router';
import { GameScreen } from '../game/GameScreen';

/** join with a code (readme 5.1). a shared link skips this screen. */
export default function JoinScreen() {
  const [code, setCode] = useState('');
  const [name, setName] = useState(savedName);
  const [badCode, setBadCode] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = normalizeCode(code);
    if (!clean) {
      setBadCode(true);
      nudge(codeRef.current);
      codeRef.current?.focus();
      return;
    }
    if (!saveName(name)) {
      nudge(nameRef.current);
      nameRef.current?.focus();
      return;
    }
    navigate(`/r/${clean}`, { replace: true });
  };

  return (
    <GameScreen title={copy.room.joinTitle} subtitle={copy.room.online}>
      <form onSubmit={submit} className="flex w-full max-w-[320px] flex-col items-stretch gap-7">
        <TextField
          ref={codeRef}
          label={copy.room.code}
          placeholder={copy.room.codePlaceholder}
          value={code}
          onChange={(e) => {
            setBadCode(false);
            setCode(e.target.value.toUpperCase().slice(0, 6));
          }}
          hint={badCode ? copy.room.badCode : undefined}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          className="font-mono tracking-[0.3em] uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case"
          required
        />
        <TextField
          ref={nameRef}
          label={copy.room.yourName}
          placeholder={copy.room.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          autoComplete="nickname"
          enterKeyHint="go"
          required
        />
        <PillButton type="submit" className="mt-1">
          {copy.room.join}
        </PillButton>
      </form>
    </GameScreen>
  );
}
