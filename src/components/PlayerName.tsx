/**
 * A player's name. A generated nickname ends in a tag such as `#4F2A`; inside Arabic text the
 * browser would show it as `4F2A#`, so the tag is isolated as left-to-right text.
 */
export function PlayerName({ name }: { name: string }) {
  const tagStart = name.lastIndexOf(' #');

  if (tagStart === -1) {
    return name;
  }

  const words = name.slice(0, tagStart);
  const tag = name.slice(tagStart + 1);

  return (
    <>
      {words} <bdi dir="ltr">{tag}</bdi>
    </>
  );
}
