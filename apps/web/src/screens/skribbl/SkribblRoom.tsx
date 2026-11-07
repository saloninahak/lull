import type { RoomGameProps } from '../rooms/OnlineFrame';
import { DrawRoom } from './DrawRoom';

/** skribbl: one draws, everyone else types guesses */
export default function SkribblRoom(props: RoomGameProps) {
  return <DrawRoom {...props} />;
}
