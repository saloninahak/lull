import type { RoomGameProps } from '../rooms/OnlineFrame';
import { DrawRoom } from '../skribbl/DrawRoom';

/** pictionary: one draws, the room says it out loud, the drawer taps who got it */
export default function PictionaryRoom(props: RoomGameProps) {
  return <DrawRoom {...props} />;
}
